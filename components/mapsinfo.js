// MapsInfo page component
window.MapsInfoPage = {
  render: function() {
    return `
      <div class="mapsinfo-container">
        <h2>Maps of Yola</h2>
        <div id="mapsinfo-chat-area" class="mapsinfo-chat-area">
          <!-- Chat area for directions (Google Maps API placeholder) -->
          <div class="mapsinfo-chat-placeholder">
            <p>Ask for directions or places in Yola:</p>
            <input type="text" id="mapsinfo-chat-input" placeholder="e.g., Show me hospitals near me" style="width:70%;padding:0.5em;" />
            <button id="mapsinfo-chat-send" style="padding:0.5em 1em;">Send</button>
            <div id="mapsinfo-chat-messages" style="margin-top:1em;"></div>
          </div>
        </div>
        <div id="mapsinfo-map" class="mapsinfo-map" style="width:100%;height:400px;margin-top:2em;"></div>
      </div>
    `;
  },
  mount: function() {
    // Load Google Maps script if not already loaded
    if (!window.google || !window.google.maps) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB41DRUbKWJHPxaFjMAwdrzWzbVKartNGg&callback=initYolaMap';
      script.async = true;
      document.body.appendChild(script);
      window.initYolaMap = function() {
        window.MapsInfoPage.initMap();
      };
    } else {
      window.MapsInfoPage.initMap();
    }
    // Placeholder chat logic
    document.getElementById('mapsinfo-chat-send').onclick = function() {
      const input = document.getElementById('mapsinfo-chat-input').value.trim();
      if (input) {
        const msgDiv = document.createElement('div');
        msgDiv.textContent = 'You: ' + input;
        document.getElementById('mapsinfo-chat-messages').appendChild(msgDiv);
        // Placeholder for Google Maps directions/chat API
        const replyDiv = document.createElement('div');
        replyDiv.textContent = '[Directions/response will appear here]';
        replyDiv.style.color = '#3182ce';
        document.getElementById('mapsinfo-chat-messages').appendChild(replyDiv);
      }
    };
  },
  initMap: function() {
    const yola = { lat: 9.2035, lng: 12.4954 };
    const map = new google.maps.Map(document.getElementById('mapsinfo-map'), {
      center: yola,
      zoom: 13,
      mapTypeId: 'satellite'
    });
    new google.maps.Marker({ position: yola, map: map, title: 'Yola' });
  }
};

// Register as section
