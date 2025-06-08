// src/utils/ApiResponse.js
export default class ApiResponse {
    /**
     * @param {number} statusCode
     * @param {any}    data
     * @param {string} message
     */
    constructor(statusCode, data, message) {
      this.statusCode = statusCode;
      this.data       = data;
      this.message    = message;
    }
  }
  