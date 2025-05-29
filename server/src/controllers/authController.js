import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateAccessandRefreshToken = (userID) => {
  try {
    const accessToken = jwt.sign(
      { _id: userID },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );

    const refreshToken = jwt.sign(
      { _id: userID },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "10d" }
    );

    return { accessToken, refreshToken };
  } catch (error) {
    
    throw new Error(
      error.message || "Something went wrong during token generation"
    );
  }
};

///////////////////////////////////////////////////////////////////////////////////////

export const login = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const matchPass = await bcrypt.compare(password, user.password);
    if (!matchPass) {
      return res.status(404).json({
        success: false,
        message: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = generateAccessandRefreshToken(
      user._id
    );

    user.refreshToken = refreshToken;

    const loggedInUser = await user.save();

    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    };

    return res
      .status(201)
      .cookie("refreshToken", refreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json({
        success: true,
        message: "Logged in successfully",
        user: {
          id: loggedInUser._id,
          username: loggedInUser.username,
          email: loggedInUser.email,
          role: loggedInUser.role,
          token: accessToken
        },
      });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
});

///////////////////////////////////////////////////////////////////////////////////////

export const Signup = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate inputs
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all the fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter a password of at least 6 characters",
      });
    }
    // Check if the email already exists
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (user) {
      return res
        .status(409)
        .json({ success: false, message: "User or Email already exists" });
    }

    // Hash the password and save the user
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });

    if (newUser.email === process.env.ADMIN_EMAIL) {
      newUser.role = "superAdmin";
    }

    await newUser.save();

    return res.status(201).json({
      id: newUser._id,
      user: newUser.username,
      role: newUser.role,
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

export const logout = asyncHandler(async (req, res) => {
  try {
    const user = req.user;

    await User.findByIdAndUpdate(
      user._id,
      {
        $unset: {
          refreshToken: 1, // this removes the field from document
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({
        success: true,
        message: "Logged out successfully",
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized request — no token provided"
    });
  }

  try {
    // Verify the token signature & expiry
    const decoded = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user
    const user = await User.findById(decoded._id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token — user not found"
      });
    }

    // Make sure it matches what we have stored
    if (incomingRefreshToken !== user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token expired or already used"
      });
    }

    // Generate a new access token (we're not rotating the refresh token here)
    const { accessToken } = generateAccessandRefreshToken(user._id);

    const cookieOpts = {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    };

    // Send back both cookies and JSON
    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOpts)
      .cookie("refreshToken", incomingRefreshToken, cookieOpts)
      .json({
        success: true,
        message: "Access token refreshed",
        data: {
          accessToken,
          refreshToken: incomingRefreshToken
        }
      });

  } catch (error) {
    // Token verification failed (invalid or expired)
    return res.status(401).json({
      success: false,
      message: error.message || "Invalid or expired refresh token"
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

export const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email }); // Corrected find method

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email does not exist",
      });
    }

    const resetToken = jwt.sign(
      { _id: user._id },
      process.env.RESET_TOKEN_SECRET,
      { expiresIn: "10m" }
    );

    let mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    let mailDetails = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Link",
      text: `http://localhost:5173/update-password/${resetToken}`,
    };

    mailTransporter.sendMail(mailDetails, (err, data) => {
      if (err) {
        // console.error("Error Occurred:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to send email. Please try again later." + err,
        });
      } else {
        // console.log("Email sent successfully");
        return res.status(200).json({
          success: true,
          message: "Password reset link has been sent to your email.",
        });
      }
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

export const updatePassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;

  if (!resetToken) {
    return res.status(400).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Please enter a password",
    });
  }

  try {
    const decodedToken = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);

    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "Link has expired. Please try again",
      });
    }

    const user = await User.findById(decodedToken._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid or Expired Token",
    });
  }
});

////////////////////////////////////////////////////////////////////////////////////////

export const changePassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const userId = req.user._id; // From jwtVerify middleware

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Please enter a new password",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters long",
    });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
});

