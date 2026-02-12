import { Link } from 'react-router-dom';
import Background from '../assets/images/bg/1.png';
import EmailIcon from '../assets/icons/email.png';
import KeyIcon from '../assets/icons/key.png';
import RocketImg from '../assets/images/side/rocket.png';
import AppHeader from '../components/AppHeader';

export default function RegisterPage() {
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
      <main className="flex-1 flex flex-row items-center justify-center z-[1] mt-10 w-full min-h-[80vh] max-[900px]:flex-col max-[900px]:mt-0 max-[900px]:min-h-0 max-[600px]:flex-col max-[600px]:mt-0 max-[600px]:min-h-0">
        <div className="flex-1 flex items-center justify-center min-w-[320px] max-w-[520px] z-[2] max-[900px]:hidden max-[600px]:flex max-[600px]:min-w-[120px] max-[600px]:max-w-[180px] max-[600px]:mb-[18px]">
          <img src={RocketImg} alt="Rocket and Clouds" className="w-[90%] max-w-[420px] h-auto object-contain max-[600px]:w-[60vw] max-[600px]:max-w-[180px]" />
        </div>
        <div className="flex-1 flex flex-col items-start justify-center min-w-[320px] max-w-[520px] ml-8 z-[2] max-[900px]:min-w-[220px] max-[900px]:max-w-[98vw] max-[900px]:ml-0 max-[900px]:items-center max-[900px]:text-center max-[600px]:min-w-[120px] max-[600px]:max-w-[98vw] max-[600px]:ml-0 max-[600px]:items-center max-[600px]:text-center">
          <h1 className="text-[3.2rem] font-light text-white text-left mb-12 leading-[1.1] font-sans tracking-[-1px] [text-shadow:0_2px_16px_rgba(0,0,0,0.18)] max-[900px]:text-center max-[600px]:text-[2rem] max-[600px]:text-center">Welcome to<br />Jennah</h1>
          <form className="flex flex-col items-start w-full max-w-[480px] mx-auto mb-8 max-[900px]:max-w-[98vw] max-[900px]:items-center max-[600px]:max-w-[98vw] max-[600px]:items-center">
            <label className="text-white text-[1.1rem] font-medium mb-2 self-start font-sans" htmlFor="email">Email Address</label>
            <div className="flex items-center w-full bg-[rgba(255,255,255,0.08)] border-[1.5px] border-white rounded-full mb-6 px-[18px] h-14 max-[600px]:h-11 max-[600px]:px-2">
              <img src={EmailIcon} alt="Email" className="w-8 h-8 mr-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)] max-[600px]:w-6 max-[600px]:h-6 max-[600px]:mr-2" />
              <input
                type="email"
                id="email"
                className="flex-1 bg-transparent border-none outline-none text-white text-[1.2rem] font-sans p-0 placeholder:text-white placeholder:opacity-80 placeholder:text-[1.1rem]"
                placeholder="alphabet@gmail.com"
                autoComplete="email"
              />
            </div>
            <label className="text-white text-[1.1rem] font-medium mb-2 self-start font-sans" htmlFor="password">Password</label>
            <div className="flex items-center w-full bg-[rgba(255,255,255,0.08)] border-[1.5px] border-white rounded-full mb-6 px-[18px] h-14 max-[600px]:h-11 max-[600px]:px-2">
              <img src={KeyIcon} alt="Password" className="w-8 h-8 mr-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)] max-[600px]:w-6 max-[600px]:h-6 max-[600px]:mr-2" />
              <input
                type="password"
                id="password"
                className="flex-1 bg-transparent border-none outline-none text-white text-[1.2rem] font-sans p-0 placeholder:text-white placeholder:opacity-80 placeholder:text-[1.1rem]"
                placeholder=""
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="bg-[#0a4a6e] text-white rounded-full py-4 w-full max-w-[240px] text-[1.3rem] font-semibold border-none outline-none mt-3 mb-6 cursor-pointer transition-colors duration-200 font-sans hover:bg-[#0077ff] max-[600px]:text-base max-[600px]:py-3">Sign up</button>
          </form>
          <div className="text-white text-[1.1rem] text-left mt-4 max-[900px]:text-center max-[600px]:text-center">
            Already have an account? <Link to="/login" className="text-[#b3e0ff] underline font-medium ml-1 hover:text-white">Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
