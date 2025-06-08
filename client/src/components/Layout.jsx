import React from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, ShoppingCart, ListChecks, Users2, Briefcase, DollarSign, 
  ShieldCheck, UserCog, UserCircle, Menu, X, Settings, LogOut, FileText, Sun, Moon,
  CreditCard, Wallet, Building
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/components/ui/use-toast';
import { useDispatch } from 'react-redux';
import { clearUser } from '@/services/userSlice';
import { useLogoutMutation } from '@/api/authApi';

const ROLE_BASED_NAV_ITEMS = {
  salesman: [
    { href: '/sale/new', label: 'New Sale', icon: ShoppingCart },
    { href: '/sales', label: 'Sales History', icon: ListChecks },
  ],
  employee: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/summary', label: 'Summary', icon: FileText },
    // Sales Section
    { href: '/sale/new', label: 'New Sale', icon: ShoppingCart },
    { href: '/sales', label: 'Sales History', icon: ListChecks },
    // Financial Section
    { href: '/expenses', label: 'Expenses', icon: CreditCard },
    { href: '/bank', label: 'Bank Register', icon: Building },
    { href: '/cash', label: 'Cash Register', icon: Wallet },
    // Business Section
    { href: '/vendors', label: 'Vendors', icon: Briefcase },
    { href: '/employees', label: 'Employees', icon: Users2 },
    { href: '/payroll', label: 'Payroll', icon: DollarSign },
  ],
  admin: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/summary', label: 'Summary', icon: FileText },
    // Sales Section
    { href: '/sale/new', label: 'New Sale', icon: ShoppingCart },
    { href: '/sales', label: 'Sales History', icon: ListChecks },
    // Financial Section
    { href: '/expenses', label: 'Expenses', icon: CreditCard },
    { href: '/bank', label: 'Bank Register', icon: Building },
    { href: '/cash', label: 'Cash Register', icon: Wallet },
    // Business Section
    { href: '/vendors', label: 'Vendors', icon: Briefcase },
    { href: '/employees', label: 'Employees', icon: Users2 },
    { href: '/payroll', label: 'Payroll', icon: DollarSign },
    // Admin Section
    { href: '/audit', label: 'Audit Log', icon: ShieldCheck },
    { href: '/users', label: 'Manage Users', icon: UserCog },
  ],
  superAdmin: [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/summary', label: 'Summary', icon: FileText },
    // Sales Section
    { href: '/sale/new', label: 'New Sale', icon: ShoppingCart },
    { href: '/sales', label: 'Sales History', icon: ListChecks },
    // Financial Section
    { href: '/expenses', label: 'Expenses', icon: CreditCard },
    { href: '/bank', label: 'Bank Register', icon: Building },
    { href: '/cash', label: 'Cash Register', icon: Wallet },
    // Business Section
    { href: '/vendors', label: 'Vendors', icon: Briefcase },
    { href: '/employees', label: 'Employees', icon: Users2 },
    { href: '/payroll', label: 'Payroll', icon: DollarSign },
    // Admin Section
    { href: '/audit', label: 'Audit Log', icon: ShieldCheck },
    { href: '/users', label: 'Manage Users', icon: UserCog },
  ],
};

const bottomNavItems = [
  { href: '/profile', label: 'Profile', icon: UserCircle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

const SidebarLink = ({ item, isOpen, onClick }) => (
  <NavLink
    to={item.href}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out',
        'hover:bg-primary/10 hover:text-primary',
        isActive ? 'bg-primary/20 text-primary' : 'text-muted-foreground'
      )
    }
  >
    <item.icon className={cn('h-5 w-5 shrink-0', isOpen && 'mr-3')} />
    <AnimatePresence>
      {isOpen && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: 'auto' }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden whitespace-nowrap"
        >
          {item.label}
        </motion.span>
      )}
    </AnimatePresence>
  </NavLink>
);

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false); 
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = React.useState(false);
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const role = localStorage.getItem('role');

  // Get navigation items based on user role
  const navItems = ROLE_BASED_NAV_ITEMS[role] || [];

  React.useEffect(() => {
    const handleResize = () => {
      const mobileCheck = window.innerWidth < 768; 
      setIsMobile(mobileCheck);
      setIsSidebarOpen(!mobileCheck); 
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  React.useEffect(() => {
    if (isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const dispatch = useDispatch();

  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      dispatch(clearUser());
      const response = await logout().unwrap();

      if (response.success) {
        toast({
          title: "Logout Successful",
          description: response.message,
          variant: "default",
        });
        setTimeout(() => {
          navigate("/login");
        }, 500);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const sidebarVariants = {
    open: (isMobileView) => ({
      x: isMobileView ? '0%' : '0%',
      width: 280,
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.3 },
    }),
    closed: (isMobileView) => ({
      x: isMobileView ? '-100%' : '0%',
      width: isMobileView ? 280 : 0,
      opacity: isMobileView ? 1 : 0,
      transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.3 },
    }),
  };
  
  let pageTitle = "Page";
  const currentPath = location.pathname;
  const mainNavItem = navItems.find(item => currentPath.startsWith(item.href) && (item.href === '/' || currentPath.length >= item.href.length));
  const bottomNavItem = bottomNavItems.find(item => currentPath.startsWith(item.href));

  if (mainNavItem) {
    pageTitle = mainNavItem.label;
  } else if (bottomNavItem) {
    pageTitle = bottomNavItem.label;
  } else if (currentPath.includes('/vendors/') && currentPath.includes('/transactions')) {
    pageTitle = "Vendor Transactions";
  }


  const sidebarSharedContent = (
    <>
      <div className={cn(
          "flex items-center border-b border-border shrink-0 px-6 h-20"
      )}>
        <Link to="/" className="flex items-center gap-2" onClick={isMobile ? toggleSidebar : undefined}>
          <img  alt="Company Logo" className="h-8 w-auto" src="https://images.unsplash.com/photo-1586880244543-0528a802be97" />
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent whitespace-nowrap"
          >
            POS Pro
          </motion.h1>
        </Link>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="ml-auto">
            <X className="h-6 w-6" />
          </Button>
        )}
      </div>

      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <SidebarLink key={item.href} item={item} isOpen={true} onClick={isMobile ? toggleSidebar : undefined} />
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-border space-y-2">
        {bottomNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} isOpen={true} onClick={isMobile ? toggleSidebar : undefined} />
        ))}
        <Button variant="ghost" className={cn(
          'w-full flex items-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive', 
          'justify-start px-4 py-3'
          )}
          onClick={handleLogout}
        >
          <LogOut className={cn('h-5 w-5 shrink-0 mr-3')} />
          <span className="overflow-hidden whitespace-nowrap">Logout</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      <AnimatePresence>
        {isMobile && isSidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.div
        key="sidebar"
        custom={isMobile}
        variants={sidebarVariants}
        initial="closed"
        animate={isSidebarOpen ? "open" : "closed"}
        className={cn(
          "bg-card border-r border-border flex flex-col shrink-0 overflow-hidden h-full",
          isMobile ? "fixed inset-y-0 left-0 z-40" : "relative"
        )}
      >
        {sidebarSharedContent}
      </motion.div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-card border-b border-border flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4 text-muted-foreground hover:text-foreground">
              {isMobile ? <Menu className="h-6 w-6" /> : (isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />)}
            </Button>
            <h1 className="text-xl font-semibold text-foreground">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground hover:text-primary">
              {theme === 'dark' ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-7 w-7 text-muted-foreground hover:text-primary" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default Layout;