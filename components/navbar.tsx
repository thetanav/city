export const Navbar = () => {
  return (
    <nav className="w-full h-16 flex items-center justify-between px-4">
      <div className="text-lg font-bold">City</div>
      <div>
        <a href="/dashboard" className="mr-4 hover:underline">
          Dashboard
        </a>
        <a href="/profile" className="hover:underline">
          Profile
        </a>
      </div>
    </nav>
  );
};
