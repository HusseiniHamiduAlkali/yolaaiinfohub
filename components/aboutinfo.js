window.renderSection = function() {
  // Always load and render the navbar
  function ensureNavbarLoaded(cb) {
    if (typeof window.renderNavbar === 'function') {
      window.renderNavbar();
      if (cb) cb();
    } else {
      if (!document.getElementById('navbar-js')) {
        const script = document.createElement('script');
        script.src = 'components/navbar.js';
        script.id = 'navbar-js';
        script.onload = function() {
          if (typeof window.renderNavbar === 'function') window.renderNavbar();
          if (cb) cb();
        };
        document.body.appendChild(script);
      } else {
        let tries = 0;
        (function waitForNavbar() {
          if (typeof window.renderNavbar === 'function') {
            window.renderNavbar();
            if (cb) cb();
          } else if (tries < 30) {
            tries++;
            setTimeout(waitForNavbar, 100);
          }
        })();
      }
    }
  }
  ensureNavbarLoaded();
  document.getElementById('main-content').innerHTML = `
    <section class="info-section">
      <div class="about-container">
        <div class="about-header" style="text-align: center; margin-top: 50px; margin-bottom: 5px; font-size: 1.5rem;"><strong>About Yola AI Info Hub</strong></div>
        <div class="about-content">
          <p><strong>Yola AI Info Hub</strong> is a modern, responsive web app that provides AI-powered information and assistance for education, agriculture, environment, health, community, and general inquiries in Yola, Adamawa State, Nigeria. Our goal is to make essential information accessible and easy to find for residents and visitors alike.</p>
          <h3>Key Features:</h3>
          <ul>
            <li><strong>AI-Powered Chat:</strong> Get instant answers to your questions across various categories.</li>
            <li><strong>Section-Specific Information:</strong> Dedicated sections for EduInfo, AgroInfo, EcoInfo, MediInfo, NaviInfo, and ServiInfo.</li>
            <li><strong>User-Friendly Interface and Responsiveness:</strong> A clean, intuitive design for seamless navigation on different devices <br> PC above 1150px, Tab from 900px to 1150px , Mobile below 900px,<br>with Hamburger Menu on Mobile Screen.</li>
            <li><strong>Image, Audio and Files Input:</strong> Interact with the AI using images, voice messages and other files for a richer experience.</li>
            <li><strong>Text-To-Speech:</strong> A text-to-speech option to listen to the AI's response in any section.</li>
            <li><strong>Local Focus:</strong> Specialized information relevant to Yola, Adamawa State, Nigeria.</li>
            <li><strong>Multi Modality:</strong> A pecial functionality, enabling user to switch between two different Gemini models for their response.</li>
            <li><strong>Chat History:</strong>Ability to remember recent chats history by the AI, for about 10 chats. For a continious chat flow.</li>
            <li><strong>Frequently Asked Questions FAQs:</strong> FAQs available as clickable links directly below the chat areas of every section.</li>
          </ul>
          
          <h3>Section-specific Features:</h3>
          <ul>
            <li><strong>NaviInfo:</strong> Maps For Directions and Navigation.</li>
            <li><strong>EcoInfo:</strong> Carbon Calculator and an Eco Classifier, which is able to classify objects (images) as recylable or not.</li>
          </ul>
          <h3>Contents of the Environment Variable (.env file):</h3>
          <ul style="list-style: none;">
            <li>1. Google Gemini API KEY.</li>
            <li>2. Google Maps API KEY.</li>
            <li>3. Mongodb URI For User Authentication.</li>
            <li>4. Dedicated e-mail Adress.</li>
            <li>5. E-mail. Adress 'App Password' For Password Reset Route.</li>
            <li>6. Password reset URL base.</li>
            <li>7. Front-end Netlify URL.</li>
            <li>8. Back-end Render URL.</li>
            
          </ul>
          <h3>Major Challenges:</h3>
          <ul>
            <li>Power/Electricity.</li>
            <li>Internet Access (Thanks to the Weekly Reflection Data Reward, It Has Really Cushioned This Effect).</li>
            
          </ul>

          <p>This platform is designed to be a comprehensive information hub, leveraging the power of Artificial Intelligence to serve the Yola community better.</p>

          <p><strong>I Husseini Hamidu Alkali the Chief Pilot, Together With GitCopilot We Are Able To Land Unto This Robust Project For My July 3MTT Knowledge Showcase.</strong><p>
          <p><strong>My Fellow ID: FE/23/1941341. Cohort 3.
          
        </div>
      </div>
    </section>
  `;
  window.handleMessage = async function(msg) {
    const chat = document.getElementById('chat-messages');
    const input = document.getElementById('chat-input');
    const preview = document.getElementById('chat-preview');
    const msgGroup = document.createElement('div');
    msgGroup.classList.add('ai-msg');
    msgGroup.innerHTML = `<span class='ai-msg-text'>...</span>`;
    chat.appendChild(msgGroup);
    chat.scrollTop = chat.scrollHeight;

    if (!msg) return;

    if (/about|info|hub|platform|what is this/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'Yola AI Info Hub is a modern, responsive web app that provides AI-powered information and assistance for various categories in Yola, Adamawa State, Nigeria.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/contact|support|help/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For support, please visit our contact page or email us at support@yolainfohub.com.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/edu|school|education/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For education info, check the EduInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/eco|environ|waste/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For environmental info, check the EcoInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/navi|map|direction/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For navigation info, check the NaviInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/servi|professional|service/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For professional services, check the ServiInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/agro|farm|crop|soil/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For agriculture info, check the AgroInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/medi|health|doctor|hospital/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For medical info, check the MediInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    } else if (/community|event|group/i.test(msg)) {
      msgGroup.querySelector('.ai-msg-text').innerHTML = 'For community info, check the CommunityInfo section.';
      chat.scrollTop = chat.scrollHeight;
      input.value = '';
      return;
    }
    // Call Gemini via backend proxy
    try {
      if (typeof window.callGemini !== 'function') throw new Error('Backend proxy not available');
      const payload = { model: 'gemini-1.5-flash', contents: [{ parts: [{ text: msg }] }] };
      const data = await window.callGemini(payload);
      let aiText = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) ? data.candidates[0].content.parts[0].text : "Sorry, I couldn't get a response from the AI.";
      msgGroup.querySelector('.ai-msg-text').innerHTML = aiText;
    } catch (error) {
      console.error('Error calling Gemini proxy:', error);
      msgGroup.querySelector('.ai-msg-text').innerHTML = "Sorry, there was an error connecting to the AI. Please try again later.";
    }
    chat.scrollTop = chat.scrollHeight;
    input.value = '';
  };
};
