import { Link } from 'react-router-dom';
import { useState } from 'react';
import Background from '../assets/HomeScreen/Background.png';
import MenuIcon from '../assets/icons/menu.png';
import AppHeader from '../components/AppHeader';

export default function HomeScreen() {
  // const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative"
      style={{
        backgroundImage: `url(${Background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <AppHeader />
    
      <main className="flex-1 flex flex-col items-center justify-center z-[1] mt-8 pb-[60px] max-[900px]:mt-0">
        <button className="bg-transparent border-[1.5px] border-white text-white rounded-full px-8 py-[10px] text-[1.1rem] font-medium mb-8 cursor-pointer font-sans transition-all duration-200 hover:bg-white hover:text-[#1a2a3a] max-[600px]:text-base max-[600px]:px-[18px] max-[600px]:py-2">Simplify your workload</button>
        <h1 className="text-[4rem] font-bold text-white text-center mb-[18px] leading-[1.1] font-sans tracking-[-1px] [text-shadow:0_2px_16px_rgba(0,0,0,0.18)] max-[600px]:text-[2.2rem]">
          Ship code,<br />
          <span className="text-white font-normal opacity-85">Not infrastructure</span>
        </h1>
        <p className="text-[1.3rem] text-white text-center mb-12 font-normal font-sans opacity-92 [text-shadow:0_2px_12px_rgba(0,0,0,0.18)] max-[600px]:text-base max-[600px]:mb-8 max-[600px]:px-[5%]">
          A unified interface to schedule, monitor, and manage containerized<br />
          jobs on GCP Batch
        </p>
        <Link to="/auth/login" className="bg-white text-[#1a2a3a] px-12 py-[18px] rounded-full text-[1.4rem] font-bold no-underline transition-all duration-200 shadow-[0_2px_12px_rgba(0,0,0,0.08)] font-sans tracking-[0.5px] mt-2 outline-none border-none inline-block cursor-pointer hover:bg-[#e6f2ff] hover:text-[#0077ff] max-[600px]:text-base max-[600px]:px-7 max-[600px]:py-3">Start workload</Link>
      </main>
    </div>
  );
}