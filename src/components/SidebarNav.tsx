import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Logo from '../assets/HomeScreen/Logo.png';
import ProjectsIcon from '../assets/icons/project.png';
import WorkloadIcon from '../assets/icons/job.png';
import MenuIcon from '../assets/icons/menu.png';

const navItems = [
  {
    label: 'Projects',
    icon: ProjectsIcon,
    path: '/overview',
  },
  {
    label: 'Workloads',
    icon: WorkloadIcon,
    path: '/workloads',
  },
];

export default function SidebarNav() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 900);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {isMobile && (
        <button
          className="fixed top-6 left-6 z-[1000] bg-none border-none"
          onClick={() => setOpen(true)}
        >
          <img src={MenuIcon} alt="Menu" className="w-10 h-10" />
        </button>
      )}
      {!isMobile && (
        <aside className="min-w-[320px] max-w-[360px] rounded-[18px] border-[1.5px] border-[rgba(255,255,255,0.18)] flex flex-col pt-9 relative z-[2] shadow-[0_2px_24px_rgba(0,0,0,0.18)] my-4 ml-4 max-[900px]:min-w-[120px] max-[900px]:max-w-[180px] max-[900px]:pt-6 bg-gradient-to-b from-[#004564] to-[#00263a]">
          <div className="flex items-center gap-3 px-8 pb-8 mb-2 max-[900px]:px-3 max-[900px]:pb-6">
            <a href="/"><img src={Logo} alt="Jennah Logo" className="h-[38px] w-auto block" /></a>
          </div>
          <div className="px-8 rounded-2xl mx-[18px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] pb-8 max-[900px]:px-3">
            <span className="text-[#b3e0ff] text-base font-semibold mb-[18px] block mt-[18px] ml-2">NAVIGATION</span>
            {navItems.map(item => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-[18px] rounded-2xl px-[18px] py-[18px] mb-[18px] text-white text-[1.2rem] font-medium no-underline transition-all duration-200 font-sans shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
                  location.pathname.startsWith(item.path)
                    ? 'bg-[rgba(255,255,255,0.22)] text-[#b3e0ff] border-2 border-[#b3e0ff]'
                    : 'hover:bg-[rgba(255,255,255,0.18)] hover:text-white'
                }`}
              >
                <img src={item.icon} alt={item.label} className="w-10 h-10 block" />
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="mt-auto pt-8 flex items-center gap-[18px] relative min-h-20">
              <div className="absolute left-0 bottom-[92px] text-[#b3e0ff] text-[0.9rem] tracking-wide">
                <span>YOUR ACCOUNT</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-white text-[1.1rem] font-semibold">Juan Dela Cruz</span>
                <span className="text-[#b3e0ff] text-base">cruzjuandela@gmail.com</span>
              </div>
            </div>
          </div>
        </aside>
      )}
      {isMobile && open && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-[rgba(0,0,0,0.45)] z-[1000] flex items-start justify-end" onClick={() => setOpen(false)}>
          <div className="bg-white w-[80vw] max-w-[320px] h-screen flex flex-col items-start p-8 pt-8 pb-6 shadow-[-2px_0_24px_rgba(0,0,0,0.12)] relative animate-[slideInMenu_0.2s_cubic-bezier(0.4,0,0.2,1)]" onClick={e => e.stopPropagation()}>
            <button className="absolute top-[18px] right-[18px] bg-none border-none text-[2.2rem] text-[#222] cursor-pointer z-[2]" aria-label="Close menu" onClick={() => setOpen(false)}>&times;</button>
            {navItems.map(item => (
              <Link
                key={item.label}
                to={item.path}
                className="text-[#1a2a3a] text-[1.2rem] font-medium no-underline mt-[18px] first:mt-0 font-sans w-full block transition-colors duration-200 hover:text-[#0077ff]"
                onClick={() => setOpen(false)}
              >
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="mt-8 text-[#27526e] text-[0.9rem] tracking-wide text-center">YOUR ACCOUNT</div>
            <span className="text-[#27526e]">Juan Dela Cruz</span>
            <span className="text-[#27526e]">cruzjuandela@gmail.com</span>
          </div>
        </div>
      )}
    </>
  );
}
