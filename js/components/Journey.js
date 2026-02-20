// ===========================
// Journey Component
// ===========================
const JOURNEY_TIMELINE_ITEMS = [
  {
    title: "Started Bachelor's Degree at IIT Guwahati",
    time: "Year of Enrollment - Present",
    desc: "Began my Bachelor's in Data Science and AI from IIT Guwahati, diving deep into cutting-edge technologies and foundational concepts.",
    fullDesc: `Commenced a rigorous Bachelor's program in Data Science and AI at IIT Guwahati, one of India's premier technical institutions. This program has provided a strong foundation in algorithms, machine learning, artificial intelligence, and data analytics. Actively involved in various academic projects and research initiatives, exploring advanced topics and developing practical skills in data manipulation, model building, and system optimization. My coursework includes subjects like advanced statistics, deep learning, natural language processing, and big data technologies, preparing me for a career at the forefront of data innovation.`,
    logoUrl: "assets/images/IITG_logo.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/4341/4341160.png"
  },
  {
    title: "Training at HCL TechBee Program",
    time: "Sept 2022 - Mar 2023",
    desc: "Completed intensive 6-month training focusing on Data Centre Operations, Linux CLI, networking, AWS, and basic programming.",
    fullDesc: `Underwent comprehensive 6-month training through the HCL TechBee Program, designed to equip me with essential IT skills. The curriculum covered Data Centre Operations, providing insights into managing and maintaining critical IT infrastructure. Gained practical experience with Linux CLI, network configuration, and DHCP/IP setup. Acquired fundamental knowledge in networking concepts using Cisco VLANs, routing protocols, and SSH. Understood Windows Server administration, including Active Directory and RAID setup. Received hands-on training in Amazon Web Services (AWS), focusing on cloud services like EC2, S3, and VPC, and Elastic Beanstalk. Additionally, I was introduced to basic programming concepts in Python, C, SQL, and Oracle, laying a strong foundation for future development roles. This program fostered a practical, problem-solving approach to IT challenges.`,
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/1376/1376421.png"
  },
  {
    title: "Internship at HCL - Technical Support Engineer",
    time: "Mar 2023 - Sept 2023",
    desc: "Served as Technical Support Engineer for Ericsson Global Organization, achieving high resolve counts and contributing to knowledge base articles.",
    fullDesc: `Worked as a Technical Support Engineer intern for Ericsson Global Organization, providing first-line and second-line support for complex technical issues. My responsibilities included diagnosing and resolving hardware and software problems, troubleshooting network connectivity, and assisting users with various IT-related queries. Consistently achieved high resolve count and received user satisfaction certificates, demonstrating effective problem-solving skills. Received recognition from the Global Quality and Process Head at Ericsson for contributions. Actively contributed to the internal knowledge base by drafting detailed technical articles for new technologies and solutions, improving efficiency for the support team and self-service options for users. Participated in the Skill India platform under managerial guidance, showcasing technical abilities in a competitive environment.`,
    logoUrl: "assets/images/ericsson.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/10822/10822222.png"
  },
  {
    title: "Full-Time Role & Automation Engineer",
    time: "Sept 2023 - Present",
    desc: "Transitioned to a full-time role, focusing on automation with Power Apps and Power Automate, and developing Power BI reports.",
    fullDesc: `Transitioned into a full-time role as a Technical Support Engineer and Automation Specialist. A significant portion of my role involves developing and implementing automation solutions using Microsoft Power Platform. This includes creating robust applications with Power Apps to streamline business processes, automating repetitive tasks with Power Automate flows, and designing interactive Power BI reports to provide data-driven insights. I am responsible for identifying automation opportunities, gathering requirements from stakeholders, and delivering solutions that enhance operational efficiency, reduce manual effort, and improve accuracy across various IT infrastructure domains. I collaborate closely with cross-functional teams to ensure seamless integration and deployment of automation initiatives. Developed an attendance tracker application on the Power Apps platform to streamline project resource management. Implemented automated data archiving processes, including duplication removal, improving data integrity. Created a KBA-review application and Power BI reports to enhance knowledge management and data-driven insights. Developed scripts for browser cache and cookies management to improve system performance and user experience.`,
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/4300/4300059.png"
  },
  {
    title: "Developed Key Power Platform Applications",
    time: "Ongoing",
    desc: "Successfully developed and deployed the Attendance Tracker and KBA Review applications, significantly improving operational efficiency.",
    fullDesc: `Led the development and deployment of critical applications using the Microsoft Power Platform, resulting in significant operational improvements. The 'Attendance Tracker' application, built with Power Apps and Power Automate, centralized resource management, tracked daily attendance, calculated absenteeism percentage calculation by role/location/Manager, automated data archiving using Power Automate, automated correction of incorrect attendance records, and real-time Power BI reporting and analytics. Technologies used: Power Apps, Power BI, Power Automate, SharePoint.

The 'KBA Review' application, also on Power Apps, transformed knowledge article quality management. It enabled structured reviews, integrated Gen-AI Bot optimization formatting, automated dynamic email notifications to L2 teams, and facilitated a ticketing tool-like workflow for knowledge base article updates. This includes a knowledge article quality review system, Gen-AI Bot optimization formatting, dashboards to track ongoing activities, automated dynamic email system to different L2 teams after KBA review, automated assignment to L2 groups, automated feedback to SD when changes are completed, and ticketing tool-like workflow management. Technologies used: Power Apps, Power BI, Power Automate, AI Integration.

Both projects involved end-to-end development, from requirements gathering to deployment and post-launch support, demonstrating my ability to deliver high-impact solutions. Leveraging the Microsoft Power Platform to automate processes and provide data-driven solutions for HCL and Ericsson: developed tools for attendance tracking with role-based access and automated shift reminders; integrated Power Apps with ticketing systems to streamline workflows; created and delivered data reports using Power BI for Mondelez EUC and EUC Tech departments, providing valuable insights.`,
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/8899/8899687.png"
  },
  {
    title: "Recognized for Automation & Quality",
    time: "Ongoing",
    desc: "Received multiple HCL certificates and client appreciation for automation, reports, highest resolve count and user satisfaction, with work recognized by Ericsson's Global Quality Head.",
    fullDesc: `Consistently recognized for outstanding contributions to automation and quality initiatives. Received various motivating certificates by HCL including the certificate for Automation and creating Power BI Reports, developing applications using Power Apps and USATs etc. Consistently achieved the highest resolve count among peers and garnered widespread user satisfaction, evidenced by over 50 positive client feedback instances. My work has been specifically acknowledged by the Global Quality and Process Head of Ericsson, highlighting the significant impact of my automation efforts on their global operations. Additionally, I contributed to drafting numerous useful Knowledge-Based Articles (KBAs), further enhancing knowledge management. I was also proud to represent at the State Level for Cloud Computing at Skill India in Bangalore, showcasing my technical expertise. Recognized Performing Artist on All India Radio (Nationally Broadcasted).`,
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/9961/9961540.png"
  }
];

function Journey({ setAppWinAnimation, isDark }) {
  const [openDetailIndex, setOpenDetailIndex] = React.useState(null);
  const [animatingIconIndex, setAnimatingIconIndex] = React.useState(null);
  const [gameWon, setGameWon] = React.useState(false);
  const [showGameIntro, setShowGameIntro] = React.useState(true);
  const winTimerRef = React.useRef(null);
  const iconJiggleTimerRef = React.useRef(null);
  const iconJiggleRafRef = React.useRef(null);
  const timelineItemRefs = React.useRef({});
  const startJourneyPuzzle = React.useCallback(() => {
    setShowGameIntro(false);
  }, []);

  React.useEffect(() => {
    setGameWon(false);
    setShowGameIntro(true);
  }, []);

  React.useEffect(() => {
    return () => {
      if (winTimerRef.current !== null) {
        clearTimeout(winTimerRef.current);
      }
      if (iconJiggleTimerRef.current !== null) {
        clearTimeout(iconJiggleTimerRef.current);
      }
      if (iconJiggleRafRef.current !== null) {
        cancelAnimationFrame(iconJiggleRafRef.current);
      }
    };
  }, []);

  const triggerIconJiggle = React.useCallback((index) => {
    if (iconJiggleTimerRef.current !== null) {
      clearTimeout(iconJiggleTimerRef.current);
      iconJiggleTimerRef.current = null;
    }
    if (iconJiggleRafRef.current !== null) {
      cancelAnimationFrame(iconJiggleRafRef.current);
      iconJiggleRafRef.current = null;
    }

    // Reset and re-apply class so repeated taps reliably restart the jiggle animation.
    setAnimatingIconIndex(null);
    iconJiggleRafRef.current = requestAnimationFrame(() => {
      setAnimatingIconIndex(index);
      iconJiggleRafRef.current = null;
      iconJiggleTimerRef.current = setTimeout(() => {
        setAnimatingIconIndex(null);
        iconJiggleTimerRef.current = null;
      }, 520);
    });
  }, []);

  const toggleDetails = (index) => {
    const nextOpenIndex = openDetailIndex === index ? null : index;
    const anchorEl = timelineItemRefs.current[index];
    const previousTop = anchorEl ? anchorEl.getBoundingClientRect().top : null;

    triggerIconJiggle(index);
    setOpenDetailIndex(nextOpenIndex);

    if (previousTop === null) return;
    requestAnimationFrame(() => {
      const updatedAnchorEl = timelineItemRefs.current[index];
      if (!updatedAnchorEl) return;
      const newTop = updatedAnchorEl.getBoundingClientRect().top;
      const delta = newTop - previousTop;
      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, left: 0, behavior: 'auto' });
      }
    });
  };

  const handleGameWin = () => {
    setAppWinAnimation(true);
    if (winTimerRef.current !== null) {
      clearTimeout(winTimerRef.current);
    }
    winTimerRef.current = setTimeout(() => {
      setAppWinAnimation(false);
      setGameWon(true);
      winTimerRef.current = null;
    }, 4200);
  };

  return (
    <section className={`mx-auto max-w-6xl ${isDark ? 'journey-space-shell' : 'journey-light-shell'} p-5 sm:p-6 lg:p-7 rounded-3xl shadow-xl mb-10`}>
      {!gameWon ? (
        showGameIntro ? (
          <div
            className={`relative isolate overflow-hidden rounded-3xl p-6 sm:p-10 text-center animate-section-in min-h-[360px] sm:min-h-[420px] flex items-center justify-center select-none ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
          >
            <button
              type="button"
              onClick={startJourneyPuzzle}
              className={`absolute inset-0 z-20 rounded-3xl cursor-pointer touch-manipulation ${isDark ? 'focus-visible:ring-2 focus-visible:ring-emerald-300/70' : 'focus-visible:ring-2 focus-visible:ring-blue-400/70'}`}
              aria-label="Start life journey game"
            />
            {isDark ? (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_22%,rgba(16,185,129,0.24),transparent_38%),radial-gradient(circle_at_78%_74%,rgba(34,197,94,0.2),transparent_42%),radial-gradient(circle_at_58%_42%,rgba(16,185,129,0.14),transparent_46%)]"></div>
                <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-300/18 blur-3xl"></div>
                <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-green-300/16 blur-3xl"></div>
              </>
            ) : (
              <>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_24%,rgba(255,255,255,0.86),transparent_42%),radial-gradient(ellipse_at_76%_68%,rgba(255,255,255,0.76),transparent_44%),linear-gradient(180deg,rgba(248,252,255,0.7),rgba(219,234,254,0.34))]"></div>
                <div className="pointer-events-none absolute top-10 left-8 h-16 w-36 rounded-full bg-white/78 blur-xl"></div>
                <div className="pointer-events-none absolute top-20 right-10 h-14 w-32 rounded-full bg-white/72 blur-xl"></div>
                <div className="pointer-events-none absolute bottom-12 left-14 h-14 w-34 rounded-full bg-white/66 blur-xl"></div>
              </>
            )}
            <div className="relative z-30 max-w-2xl mx-auto">
              {!isDark && (
                <div className="pointer-events-none absolute inset-0 -z-10">
                  <div className="absolute -top-2 left-1/2 h-14 w-44 -translate-x-1/2 rounded-full bg-white/82 blur-lg"></div>
                  <div className="absolute top-16 left-1/2 h-10 w-52 -translate-x-[60%] rounded-full bg-white/72 blur-lg"></div>
                  <div className="absolute top-20 left-1/2 h-10 w-48 -translate-x-[8%] rounded-full bg-white/68 blur-lg"></div>
                </div>
              )}
              <h2 className={`text-3xl sm:text-5xl font-extrabold leading-tight mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Start the Journey Puzzle</h2>
              <p className={`text-sm sm:text-xl mb-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Guide the ghost from home to destination while avoiding obstacles.</p>
              <p className={`text-xs sm:text-sm mb-7 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tap anywhere on this panel, or press Start Puzzle. Use arrow keys on desktop or swipe on mobile.</p>
              <button
                type="button"
                onClick={startJourneyPuzzle}
                className={`inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full font-extrabold text-sm sm:text-base transition ${isDark ? 'bg-emerald-400/15 border border-emerald-200/30 text-emerald-100 hover:bg-emerald-400/25 shadow-[0_10px_22px_rgba(2,6,23,0.35)]' : 'bg-blue-100 border border-blue-300 text-blue-900 hover:bg-blue-200 shadow-[0_8px_18px_rgba(59,130,246,0.2)]'}`}
              >
                <span className="text-base leading-none">▶</span>
                <span>Start Puzzle</span>
              </button>
            </div>
          </div>
        ) : (
          <PathfinderGame onGameWin={handleGameWin} isDark={isDark} />
        )
      ) : (
        <>
          <h2 className={`text-3xl font-extrabold text-center mb-2 tracking-tight drop-shadow-sm ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>My Life Journey & Experiences</h2>
          <p className={`journey-milestones-intro text-center mb-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Explore the significant milestones, professional growth, and personal experiences that have shaped my journey.</p>
          <div className="mt-8 sm:mt-10 max-w-5xl mx-auto">
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-sky-200' : 'text-blue-950'}`}>Timeline</h3>
            <ol className="timeline-list">
              {JOURNEY_TIMELINE_ITEMS.map((item, i) => (
                <li
                  className="timeline-item"
                  key={i}
                  ref={(el) => {
                    if (el) {
                      timelineItemRefs.current[i] = el;
                    } else {
                      delete timelineItemRefs.current[i];
                    }
                  }}
                >
                  <span className="timeline-dot">
                    <img
                      src={item.iconUrl}
                      alt="icon"
                      className={`timeline-icon ${animatingIconIndex === i ? 'animate-jiggle' : ''}`}
                      loading="lazy"
                    />
                  </span>
                  <div className="flex-1">
                    <div 
                      className={`timeline-content journey-timeline-card cursor-pointer flex justify-between items-start ${isDark ? 'text-slate-100' : ''}`}
                      onClick={() => {
                        toggleDetails(i);
                      }}
                    >
                      <div className="flex-grow">
                        <h4 className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{item.title}</h4>
                        <span className={`block text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{item.time}</span>
                        <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.desc}</p>
                      </div>
                      {item.logoUrl && (
                        <img 
                          src={item.logoUrl} 
                          alt={`${item.title} logo`} 
                          className="w-10 h-10 object-contain ml-4 mt-1 flex-shrink-0"
                          loading="lazy"
                        />
                      )}
                      {openDetailIndex !== i && (
                        <div className="absolute bottom-2 right-2">
                          <svg className={`w-6 h-6 animate-bounce-slow ${isDark ? 'text-slate-500' : 'text-black'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7-7-7"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                    {openDetailIndex === i && (
                      <div
                        className={`journey-details-panel mt-2 cursor-pointer ${isDark ? 'journey-space-panel' : 'journey-light-panel'}`}
                        onClick={() => toggleDetails(i)}
                      >
                        <p>{item.fullDesc}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className={`text-center mt-8 text-lg font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Learning and developing skills to contribute and make a meaningful impact!</p>
          </div>
        </>
      )}
    </section>
  );
}
