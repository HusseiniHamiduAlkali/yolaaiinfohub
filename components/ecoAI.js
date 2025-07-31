// Handle image classification
window.handleImageUpload = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('imagePreview');
    const result = document.getElementById('classificationResult');
    const instructions = document.querySelector('.instructions');

    // Show preview
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    result.innerHTML = 'Analyzing image...';

    // Wait for image to load
    preview.onload = async () => {
        try {
            const classification = await window.ecoClassifier.classifyImage(preview);
            
            result.innerHTML = `
                <p>Classification: ${classification.label}</p>
                <p>Confidence: ${classification.confidence}%</p>
            `;

            // Show recycling instructions
            const instructionText = getRecyclingInstructions(classification.label);
            instructions.innerHTML = `
                <h3>Recycling Instructions:</h3>
                <p>${instructionText}</p>
            `;
        } catch (error) {
            result.innerHTML = 'Error analyzing image. Please try again.';
            console.error('Classification error:', error);
        }
    };
};

// Get recycling instructions based on classification
function getRecyclingInstructions(label) {
    const instructions = {
        'Recyclable-Paper': 'Clean and dry paper products can be recycled. Remove any plastic windows, staples, or non-paper materials.',
        'Recyclable-Plastic': 'Check the recycling number on the bottom. Rinse containers and remove caps/lids.',
        'Recyclable-Glass': 'Rinse thoroughly. Remove caps and lids. Sort by color if required by your local recycling program.',
        'Recyclable-Metal': 'Rinse cans and containers. Crush if possible to save space.',
        'Non-Recyclable': 'This item should go in regular waste. Consider if there are reusable alternatives.',
        'Compostable': 'Add to your compost bin or green waste collection. Break down larger items for faster composting.'
    };
    return instructions[label] || 'Please check your local recycling guidelines for specific instructions.';
}

// Calculate carbon footprint
window.calculateCarbonFootprint = function() {
    const data = {
        transportation: {
            car: parseFloat(document.getElementById('carDistance').value) || 0,
            bus: parseFloat(document.getElementById('busDistance').value) || 0
        },
        energy: {
            electricity: parseFloat(document.getElementById('electricity').value) || 0
        },
        food: {
            meat: parseFloat(document.getElementById('meatMeals').value) || 0,
            vegetarian: parseFloat(document.getElementById('vegMeals').value) || 0
        }
    };

    const footprint = window.carbonCalculator.getTotalFootprint(data);
    const recommendations = window.carbonCalculator.getRecommendations(footprint);

    // Display results
    document.getElementById('carbonResult').innerHTML = `
        <h3>Your Carbon Footprint:</h3>
        <p>${footprint} kg CO2e per week</p>
    `;

    document.getElementById('recommendations').innerHTML = `
        <h3>Recommendations:</h3>
        <ul>
            ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    `;
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }
});
