import FolderIcon from '../assets/icons/folder.png';

interface ProjectCardProps {
  name?: string;
  quota?: number;
  running?: number;
  fail?: number;
  lastUsed?: string;
  healthy?: boolean;
}

export default function ProjectCard({
  name = 'PRJName',
  quota = 45,
  running = 3,
  fail = 0,
  lastUsed = '2 minutes ago',
  healthy = true
}: ProjectCardProps) {
  return (
    <div className="bg-gradient-to-t from-black to-[#004564] rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.12)] px-8 pr-[150px] py-8 pb-6 flex flex-col gap-[3px] text-white font-sans max-[900px]:px-8 max-[900px]:pr-5 max-[900px]:pb-6 max-[900px]:gap-3">
      <div className="flex items-center gap-[18px] max-[900px]:gap-2">
        <img src={FolderIcon} alt="Folder" className="w-12 h-12 max-[900px]:w-8 max-[900px]:h-8" />
        <span className="text-[2.2rem] font-bold text-white">{name}</span>
      </div>
      <div className="flex gap-8 mb-2 max-[900px]:gap-3 max-[900px]:mb-1">
        <div className="flex flex-col gap-1">
          <span className="text-base text-[#b3e0ff] font-semibold max-[900px]:text-[0.9rem]">QUOTA</span>
          <span className="text-[3.3rem] font-bold text-white justify-center self-center max-[900px]:text-[2.3rem]">{quota}% <span className="text-base text-[#b3e0ff] font-medium max-[900px]:text-[0.9rem]">Used</span></span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base text-[#b3e0ff] font-semibold max-[900px]:text-[0.9rem]">RUNNING</span>
          <span className="text-[3.3rem] font-bold text-white justify-center self-center max-[900px]:text-[2.3rem]">{running}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-base text-[#b3e0ff] font-semibold max-[900px]:text-[0.9rem]">FAIL</span>
          <span className="text-[3.3rem] font-bold text-white justify-center self-center max-[900px]:text-[2.3rem]">{fail}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2 gap-5 max-[900px]:mt-1">
        <span className="text-base text-white opacity-80 max-[900px]:text-[0.9rem]">Last used {lastUsed}</span>
        <span className={`text-base font-semibold ${healthy ? 'text-[#00e676]' : 'text-[#ff5252]'} max-[900px]:text-[0.9rem]`}>{healthy ? '● Healthy' : '● Unhealthy'}</span>
      </div>
    </div>
  );
}
