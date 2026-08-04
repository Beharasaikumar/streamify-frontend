import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import MobileNav from "./MobileNav";

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {showSidebar && <Sidebar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />

          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile bottom navigation — only shown when sidebar would be visible */}
      {showSidebar && <MobileNav />}
    </div>
  );
};

export default Layout;
