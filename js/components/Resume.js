// ===========================
// Resume Component
// ===========================
function Resume({ isDark }) {
  const chipClass = "bg-blue-900 text-sky-100 px-2 py-0.5 rounded-full text-xs";
  const chipRowClass = "flex flex-wrap gap-2 mb-2";
  const certLinkClass = "text-blue-900 hover:underline";

  return (
    <section className={`resume-shell ${isDark ? 'bg-transparent shadow-none' : 'resume-shell-light'} p-7 rounded-3xl shadow-2xl mb-10 relative`}>
      <h2 className={`text-3xl font-extrabold text-center mb-6 tracking-tight drop-shadow-sm ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Resume</h2>
      
      <div className="absolute top-4 right-4">
        <a 
          href="Madhav_Kataria_Resume.pdf" 
          download="Madhav_Kataria_Resume.pdf"
          target="_blank" 
          rel="noopener noreferrer"
          aria-label="Download resume"
          className={`resume-download-link font-semibold text-sm hover:underline flex items-center ${isDark ? 'text-sky-300' : 'text-blue-950 bg-white/75 border border-slate-300 rounded-md px-2 py-1 shadow-sm'}`}
        >
          <span className="hidden sm:inline">Download</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </a>
      </div>

      <div id="resume-content" className={`card-float-in mb-6 rounded-xl p-6 shadow-md ${isDark ? 'resume-content-dark' : 'bg-gradient-to-br from-slate-100 via-gray-50 to-white'}`}>
        <div className="resume-professional-heading text-lg font-semibold text-gray-800 mb-2">Professional Summary</div>
        <p className="text-gray-700 mb-2">Currently pursuing a <strong className="resume-summary-accent">Bachelor&apos;s in Data Science and Artificial Intelligence from IIT Guwahati</strong>, with a strong foundation in <strong className="resume-summary-accent">data analytics, machine learning, and applied problem-solving</strong>. Possess <strong className="resume-summary-accent">3+ years of professional experience at HCL Technologies</strong>, working as a <strong className="resume-summary-accent">Consultant for multiple global clients</strong>, delivering end-to-end automation and analytics solutions. Experienced in developing RPA solutions using <strong className="resume-summary-accent">Microsoft Power Automate</strong>, building custom business applications with <strong className="resume-summary-accent">Power Apps</strong>, and creating enterprise dashboards and analytical reports using <strong className="resume-summary-accent">Power BI</strong>.</p>
        <p className="text-gray-700 mb-2">Skilled in analyzing complex <strong className="resume-summary-accent">IT infrastructure and organizational data</strong>, identifying patterns, optimizing operational processes, and monitoring <strong className="resume-summary-accent">SLA and KPI performance</strong> to support data-driven decision-making and improve operational efficiency.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <h3 className={`resume-highlight-heading font-bold text-lg mb-2 ${isDark ? '' : 'text-blue-900'}`}>Core Expertise</h3>
            <ul className="list-disc ml-6 text-gray-700">
              <li>Experience in Developing RPA (Robotic Process Automation) using Microsoft Power Automate Platform</li>
              <li>Experience in Developing Custom Applications via Power Apps Platform to make the process efficient and reduce human errors</li>
              <li>Experience in Developing industry level Power BI Reports and Dashboards</li>
              <li>Experience in Analyzing and understanding Organizational Data specifically in IT Infra Domain and tracking trends affecting targets (SLAs, KPIs etc)</li>
            </ul>
            <h3 className={`resume-highlight-heading font-bold text-lg mt-5 mb-2 ${isDark ? '' : 'text-blue-900'}`}>Certifications</h3>
            <ul className="list-disc ml-6 text-gray-700">
              <li><a href="https://www.credly.com/badges/513343d0-0d83-4761-9916-f6324436d81f/public_url" target="_blank" rel="noopener noreferrer" className={certLinkClass}>Google Cloud Associate</a></li>
              <li><a href="https://learn.microsoft.com/api/credentials/share/en-in/MadhavKataria-2316/D68B6A617A2B34D0?sharingId=D371C6433FF7895E" target="_blank" rel="noopener noreferrer" className={certLinkClass}>Power Automate RPA Developer</a></li>
              <li><a href="https://learn.microsoft.com/api/credentials/share/en-in/MadhavKataria-2316/94FFC17678CF74E8?sharingId=D371C6433FF7895E" target="_blank" rel="noopener noreferrer" className={certLinkClass}>Power BI Data Analyst</a></li>
              <li><a href="https://learn.microsoft.com/api/credentials/share/en-us/MadhavKataria-2316/FBC420B1E155F51?sharingId=D371C6433FF7895E" target="_blank" rel="noopener noreferrer" className={certLinkClass}>Azure Fundamentals</a></li>

              <li>Represented at State Level for Cloud Computing at Skill India competition (Bangalore)</li>
              <li>Participated in IIT Delhi Workshops and received certificates in AI, Cybersecurity, Machine Learning.</li>
              <li>Various motivating certificates from HCL-Tech for Automation and creating Power BI Reports, developing Power Apps.</li>
              <li>CBSE Certificate: Full Marks in Information Technologies (2018).</li>
              <li>Inspire Manak Award from Government of India for innovation.</li>
            </ul>
          </div>
          <div>
            <h3 className={`resume-highlight-heading font-bold text-lg mb-2 ${isDark ? '' : 'text-blue-900'}`}>Technical Skills</h3>
            <div className="mb-4">
              <div className="resume-purple-heading font-semibold">Machine Learning &amp; AI</div>
              <div className="text-gray-600 text-sm mb-1">Training ML models via Python libraries like "pandas", "Scikit-learn", and "NumPy". Building Custom AI bots using Different APIs.</div>
              <div className={chipRowClass}>
                <span className={chipClass}>Pandas</span>
                <span className={chipClass}>Netmiko</span>
                <span className={chipClass}>Scikit-learn</span>
                <span className={chipClass}>NumPy</span>
              </div>
              <div className="resume-purple-heading font-semibold">Cloud Computing</div>
              <div className="text-gray-600 text-sm mb-1">Skilled on Cloud Platforms like AWS, Azure and GCP (EC2, VPC, AWS Elastic Beanstalk, CloudWatch, EC2 Auto Scaling, Elastic Load Balancing, AWS IAM, LAMBDA, S3 buckets).</div>
              <div className={chipRowClass}>
                <span className={chipClass}>AWS</span>
                <span className={chipClass}>Azure</span>
                <span className={chipClass}>GCP</span>
              </div>
              <div className="resume-purple-heading font-semibold">Data Centre Operations</div>
              <div className="text-gray-600 text-sm mb-1">Switching-VLAN, trunking, inter VLAN routing, MLS-SVI, port security, VTP, STP, RSTP. Routing- static, Dynamic, RIP V2, OSPF, DHCP server, SSH, Telnet, CHAP, PAP, Access List.</div>
              <div className={chipRowClass}>
                <span className={chipClass}>Cisco Packet Tracer</span>
                <span className={chipClass}>Switching</span>
                <span className={chipClass}>Routing</span>
              </div>
              <div className="resume-purple-heading font-semibold">Microsoft Power Platform</div>
              <div className="text-gray-600 text-sm mb-1">Developing PowerApps, RPA automation flows via Power Automate and developing Reports and Dashboards via Power BI.</div>
              <div className={chipRowClass}>
                <span className={chipClass}>Power BI</span>
                <span className={chipClass}>PowerApps</span>
                <span className={chipClass}>Power Automate</span>
              </div>            
              <div className="resume-purple-heading font-semibold">System Administration</div>
              <div className="text-gray-600 text-sm mb-1">Skilled in Office 365, SharePoints, File systems, Citrix, MFA etc with OS including Linux, Windows and MAC OS.</div>
              <div className={chipRowClass}>
                <span className={chipClass}>Office 365</span>
                <span className={chipClass}>Linux</span>
                <span className={chipClass}>MacOS</span>
                <span className={chipClass}>Windows</span>
              </div>
            </div>
            <h3 className={`resume-highlight-heading font-bold text-lg mt-5 mb-2 ${isDark ? '' : 'text-blue-900'}`}>Achievements &amp; Recognition</h3>
            <ul className="list-disc ml-6 text-gray-700">
              <li>Developed Python automation scripts to identify switch vulnerabilities, collect configuration details and error logs via SSH, validate all ports, and accurately define trunk ports and VLAN assignments.</li>
              <li>Recognized by Ericsson’s Head of IT Support for designing technical processes that enhanced KBA activity, significantly improving the IT-Support Chatbot’s efficiency and user experience.</li>
              <li>Developed multiple PowerApps solutions (Attendance Tracker, Employee Details, MyApps & Dashboards) integrated with Power Automate flows and dashboards, streamlining internal processes and improving operational efficiency.</li>
              <li>Designed and deployed Power BI dashboards for Mondelēz International’s EUC and EUC-Tech departments, enabling data-driven insights and improved decision-making.</li>
              <li>Acknowledged by Ericsson’s Global Quality and Process Head for delivering exceptional user experience and maintaining high-quality standards in technical solutions.</li>
              <li>Received over 50 unsolicited client appreciations for delivering high-quality solutions and exceptional support.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

