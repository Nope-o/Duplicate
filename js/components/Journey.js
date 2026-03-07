// ===========================
// Journey Component
// ===========================
const JOURNEY_TIMELINE_ITEMS = [
  {
    title: "Started Bachelor's Degree at IIT Guwahati",
    time: "Year of Enrollment - Present",
    desc: "Began my Bachelor's in Data Science and AI from IIT Guwahati, diving deep into cutting-edge technologies and foundational concepts.",
    detailLead: "Built a strong academic base in data science and AI through rigorous coursework and project-driven learning at IIT Guwahati.",
    detailPoints: [
      "Developed foundations in algorithms, machine learning, artificial intelligence, and data analytics.",
      "Worked on academic projects and research-oriented explorations focused on practical problem-solving.",
      "Strengthened hands-on skills in data handling, model building, and system optimization.",
      "Studied advanced statistics, deep learning, natural language processing, and big-data technologies."
    ],
    detailTags: ["IIT Guwahati", "Data Science", "AI", "Research"],
    logoUrl: "assets/images/IITG_logo.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/4341/4341160.png"
  },
  {
    title: "Training at HCL TechBee Program",
    time: "Sept 2022 - Mar 2023",
    desc: "Completed intensive 6-month training focusing on Data Centre Operations, Linux CLI, networking, AWS, and basic programming.",
    detailLead: "Completed an intensive training program designed to build a practical base across infrastructure, cloud, networking, and programming.",
    detailPoints: [
      "Covered Data Centre Operations, Linux CLI, network setup, and DHCP/IP fundamentals.",
      "Learned Cisco VLANs, routing concepts, SSH workflows, and Windows Server basics including Active Directory and RAID.",
      "Gained AWS exposure across EC2, S3, VPC, and Elastic Beanstalk.",
      "Built programming fundamentals in Python, C, SQL, and Oracle.",
      "Developed a strong troubleshooting and problem-solving approach for real IT environments."
    ],
    detailTags: ["HCL TechBee", "Linux", "Networking", "AWS"],
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/1376/1376421.png"
  },
  {
    title: "Internship at HCL - Technical Support Engineer",
    time: "Mar 2023 - Sept 2023",
    desc: "Served as Technical Support Engineer for Ericsson Global Organization, achieving high resolve counts and contributing to knowledge base articles.",
    detailLead: "Worked in a hands-on support role for Ericsson Global, resolving technical issues and contributing to service quality improvements.",
    detailPoints: [
      "Handled first-line and second-line support for hardware, software, and network issues.",
      "Maintained strong resolve counts and earned user satisfaction recognition for problem-solving quality.",
      "Received appreciation from Ericsson's Global Quality and Process leadership.",
      "Authored internal technical knowledge articles to improve team efficiency and self-service support.",
      "Represented technical capability through Skill India participation under managerial guidance."
    ],
    detailTags: ["Ericsson", "Technical Support", "Knowledge Base", "Quality"],
    logoUrl: "assets/images/ericsson.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/10822/10822222.png"
  },
  {
    title: "Full-Time Role & Automation Engineer",
    time: "Sept 2023 - Present",
    desc: "Transitioned to a full-time role, focusing on automation with Power Apps and Power Automate, and developing Power BI reports.",
    detailLead: "Moved into a full-time support and automation role focused on building business solutions that reduce manual work and improve operational visibility.",
    detailPoints: [
      "Designed automation solutions using Microsoft Power Platform across Power Apps, Power Automate, and Power BI.",
      "Worked with stakeholders to identify opportunities, gather requirements, and deliver usable solutions.",
      "Improved operational accuracy and efficiency across IT infrastructure processes.",
      "Built applications such as Attendance Tracker and KBA Review, along with reporting assets and support scripts.",
      "Collaborated across teams to implement, refine, and support automation initiatives end to end."
    ],
    detailTags: ["Power Apps", "Power Automate", "Power BI", "Automation"],
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/4300/4300059.png"
  },
  {
    title: "Developed Key Power Platform Applications",
    time: "Ongoing",
    desc: "Successfully developed and deployed the Attendance Tracker and KBA Review applications, significantly improving operational efficiency.",
    detailLead: "Delivered high-impact Power Platform applications that solved real operational problems through automation, reporting, and governed workflows.",
    detailPoints: [
      "Built Attendance Tracker to centralize attendance, automate archiving and correction flows, and support real-time reporting.",
      "Built KBA Review to standardize knowledge-quality checks, notifications, assignments, and progress tracking.",
      "Handled the full lifecycle from requirement gathering to deployment and post-launch support.",
      "Improved efficiency for HCL and Ericsson teams through role-based access, automated reminders, and data-driven reporting.",
      "Used Power Apps, Power Automate, Power BI, SharePoint, and AI-assisted workflow patterns."
    ],
    detailTags: ["Attendance Tracker", "KBA Review", "Power Platform", "Delivery"],
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/8899/8899687.png"
  },
  {
    title: "Recognized for Automation & Quality",
    time: "Ongoing",
    desc: "Received multiple HCL certificates and client appreciation for automation, reports, highest resolve count and user satisfaction, with work recognized by Ericsson's Global Quality Head.",
    detailLead: "Recognition across support, automation, and quality has consistently reflected the impact of the work delivered.",
    detailPoints: [
      "Received multiple HCL certificates for automation, reporting, Power Apps solutions, and quality-focused contributions.",
      "Maintained one of the highest resolve counts among peers and earned strong user satisfaction feedback.",
      "Was specifically recognized by Ericsson's Global Quality and Process leadership.",
      "Contributed to knowledge management through useful KBA creation and process improvement efforts.",
      "Also represented Skill India at state level in Cloud Computing and performed as a recognized artist on All India Radio."
    ],
    detailTags: ["Recognition", "Quality", "Client Feedback", "Skill India"],
    logoUrl: "assets/images/hcl.webp",
    iconUrl: "https://cdn-icons-png.flaticon.com/128/9961/9961540.png"
  }
];

function renderJourneyDetail(item, isDark) {
  const detailLead = typeof item.detailLead === "string" ? item.detailLead.trim() : "";
  const detailPoints = Array.isArray(item.detailPoints)
    ? item.detailPoints.filter((point) => typeof point === "string" && point.trim().length > 0)
    : [];
  const detailTags = Array.isArray(item.detailTags)
    ? item.detailTags.filter((tag) => typeof tag === "string" && tag.trim().length > 0)
    : [];

  if (!detailLead && detailPoints.length === 0) {
    return <p>{item.fullDesc}</p>;
  }

  return (
    <div className="journey-detail-content">
      <div className={`journey-detail-kicker ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>More Details</div>
      {detailLead ? (
        <p className={`journey-detail-lead ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{detailLead}</p>
      ) : null}
      {detailPoints.length > 0 ? (
        <ul className={`journey-detail-list ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {detailPoints.map((point, index) => (
            <li key={`${item.title}-point-${index}`}>{point}</li>
          ))}
        </ul>
      ) : null}
      {detailTags.length > 0 ? (
        <div className="journey-detail-tags">
          {detailTags.map((tag) => (
            <span key={`${item.title}-${tag}`} className="journey-detail-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
                        {renderJourneyDetail(item, isDark)}
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
