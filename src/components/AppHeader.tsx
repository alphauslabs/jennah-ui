import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import Logo from '../assets/images/Logo.png';
// import MenuIcon from '../assets/icons/menu.png';
import MenuIcon from '@mui/icons-material/Menu';
export default function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="w-full flex items-center justify-between px-[60px] pt-10 bg-transparent relative z-[2]">
      <div className="flex items-center gap-3">
        <a href="/"><img src={Logo} alt="Jennah Logo" className="h-[38px] w-auto block" /></a>
      </div>
      <nav className="flex gap-10 max-[900px]:hidden">
        <Link to="/" className="text-white text-[1.1rem] no-underline font-medium transition-colors duration-200 hover:text-[#b3e0ff] font-sans">Home</Link>
        <a href="#features" className="text-white text-[1.1rem] no-underline font-medium transition-colors duration-200 hover:text-[#b3e0ff] font-sans">Features</a>
        <a href="#pricing" className="text-white text-[1.1rem] no-underline font-medium transition-colors duration-200 hover:text-[#b3e0ff] font-sans">Pricing</a>
        <a href="#contact" className="text-white text-[1.1rem] no-underline font-medium transition-colors duration-200 hover:text-[#b3e0ff] font-sans">Contact</a>
      </nav>
      {location.pathname === '/auth/login' ? (
        <Link to="/auth/register" className="bg-white text-[#1a2a3a] rounded-full px-8 py-[10px] text-[1.1rem] font-semibold no-underline border-none outline-none transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] font-sans cursor-pointer z-[2] hover:bg-[#e6f2ff] hover:text-[#0077ff] max-[900px]:hidden">Sign Up</Link>
      ) : (
        <Link to="/auth/login" className="bg-white text-[#1a2a3a] rounded-full px-8 py-[10px] text-[1.1rem] font-semibold no-underline border-none outline-none transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] font-sans cursor-pointer z-[2] hover:bg-[#e6f2ff] hover:text-[#0077ff] max-[900px]:hidden">Login</Link>
      )}
      <button className="hidden max-[900px]:flex flex-col justify-center items-center w-10 h-10 bg-none border-none cursor-pointer z-20" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
      <MenuIcon sx={{ color: 'white' }} />
      </button>
      {menuOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-[rgba(0,0,0,0.45)] z-[1000] flex items-start justify-end" onClick={() => setMenuOpen(false)}>
          <div className="bg-white w-[80vw] max-w-[320px] h-screen flex flex-col items-start p-8 pt-8 pb-6 shadow-[-2px_0_24px_rgba(0,0,0,0.12)] relative animate-[slideInMenu_0.2s_cubic-bezier(0.4,0,0.2,1)]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-[18px] right-[18px] bg-none border-none text-[2.2rem] text-[#222] cursor-pointer z-[2]" aria-label="Close menu" onClick={() => setMenuOpen(false)}>&times;</button>
            <Link to="/" className="text-[#1a2a3a] text-[1.2rem] font-medium no-underline mt-[18px] first:mt-0 font-sans w-full block transition-colors duration-200 hover:text-[#0077ff]" onClick={() => setMenuOpen(false)}>Home</Link>
            <a href="#features" className="text-[#1a2a3a] text-[1.2rem] font-medium no-underline mt-[18px] font-sans w-full block transition-colors duration-200 hover:text-[#0077ff]" onClick={() => setMenuOpen(false)}>Features</a>
            <a href="#pricing" className="text-[#1a2a3a] text-[1.2rem] font-medium no-underline mt-[18px] font-sans w-full block transition-colors duration-200 hover:text-[#0077ff]" onClick={() => setMenuOpen(false)}>Pricing</a>
            <a href="#contact" className="text-[#1a2a3a] text-[1.2rem] font-medium no-underline mt-[18px] font-sans w-full block transition-colors duration-200 hover:text-[#0077ff]" onClick={() => setMenuOpen(false)}>Contact</a>
            {location.pathname === '/login' ? (
              <Link to="/signup" className="mt-8 bg-[#0077ff] text-white rounded-full py-3 w-full text-center text-[1.1rem] font-semibold no-underline border-none outline-none transition-all duration-200 font-sans block cursor-pointer hover:bg-[#005fcc] hover:text-white" onClick={() => setMenuOpen(false)}>Sign Up</Link>
            ) : (
              <Link to="/login" className="mt-8 bg-[#0077ff] text-white rounded-full py-3 w-full text-center text-[1.1rem] font-semibold no-underline border-none outline-none transition-all duration-200 font-sans block cursor-pointer hover:bg-[#005fcc] hover:text-white" onClick={() => setMenuOpen(false)}>Login</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
