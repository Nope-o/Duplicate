
// ===========================
// PrivacyPolicy Component
// ===========================
function PrivacyPolicy({ setActiveTab, isDark }) {
  const effectiveDate = "February 13, 2026";

  return (
    <section className={`${isDark ? 'privacy-shell-dark text-slate-200 shadow-[0_20px_50px_rgba(2,6,23,0.45)]' : 'privacy-shell-light'} p-8 rounded-3xl shadow-2xl mb-10 mx-auto max-w-2xl relative`}>
      <button
        onClick={() => setActiveTab('about', 'click')}
        className={`privacy-back-btn absolute top-4 left-4 z-20 inline-flex items-center justify-center w-12 h-12 rounded-full transition-colors duration-200 cursor-pointer touch-manipulation select-none ${isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        aria-label="Go back to About section"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      <h2 className={`text-3xl font-extrabold text-center mb-6 tracking-tight drop-shadow-sm ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Privacy Policy</h2>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}><strong>Effective Date: {effectiveDate}</strong></p>
      
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-6`}>
        Thanks for visiting Madhav Kataria - Personal Website. This page explains what data this site may collect, why it is collected, and how it is handled when you browse or interact with it.
      </p>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>1. Information I Collect</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>This site may collect:</p>
      <ul className={`list-disc list-inside mb-4 pl-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        <li>Technical data such as IP address, browser/device details, and basic usage events for analytics and security monitoring.</li>
        <li>Contact form details (name, email, message) only when you send me a message.</li>
        <li>Project feedback interactions (for example, a thumbs-up action and project slug) so I can maintain like counts.</li>
        <li>Browser storage entries to support smooth UI behavior, such as one-like-per-session and cached counts.</li>
      </ul>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>2. How Information Is Used</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>Collected information is used to:</p>
      <ul className={`list-disc list-inside mb-4 pl-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        <li>Run the site smoothly and keep improving your experience.</li>
        <li>Monitor for spam, abuse, or unauthorized access.</li>
        <li>Reply to contact messages you send me.</li>
        <li>Store and display project like counts.</li>
      </ul>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>3. Third-Party Services</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
        Trusted third-party tools are used to run parts of the site. These tools may process limited data according to their own privacy policies:
      </p>
      <ul className={`list-disc list-inside mb-4 pl-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
        <li>A secure form-processing service to deliver contact messages.</li>
        <li>A traffic/performance analytics service to understand site usage and improve speed/stability.</li>
        <li>A lightweight data service to store and retrieve project like counts.</li>
      </ul>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>4. Cookies and Browser Storage</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
        Browser storage (such as <code>localStorage</code> and <code>sessionStorage</code>) may be used for feature functionality, including like-button behavior and cached counts. This storage is not used to collect sensitive personal data.
      </p>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>5. Data Retention</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
        Contact submissions and project-like records may be retained as needed for communication, analytics, and feature operation. Retention periods may vary depending on operational needs and provider settings.
      </p>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>6. Your Choices and Rights</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
        You can clear browser storage from your device settings at any time. If you want to request data correction or deletion for information submitted through this site, please use the Contact page.
      </p>

      <div className={`border-t my-6 ${isDark ? 'border-slate-700' : 'border-gray-300'}`}></div>

      <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>7. Contact</h3>
      <p className={`${isDark ? 'text-slate-300' : 'text-gray-700'} mb-4`}>
        If you have any questions about this Privacy Policy, you can{" "}
        <a
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('contact', 'click');
          }}
          className={`${isDark ? 'text-sky-300' : 'text-blue-700'} hover:underline font-semibold`}
        >
          connect
        </a>{" "}
        with me from the Contact page.
      </p>
    </section>
  );
}
