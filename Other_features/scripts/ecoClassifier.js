// Image Classification for Recyclables
// Only define EcoClassifier if not already defined on window
if (!window.EcoClassifier) {
class EcoClassifier {
    constructor() {
        this.model = null;
        this.isModelLoading = false;
        this.labels = [
            'Recyclable-Paper',
            'Recyclable-Plastic',
            'Recyclable-Glass',
            'Recyclable-Metal',
            'Non-Recyclable',
            'Compostable'
        ];
        this.loadModel();
    }

    async loadModel() {
        if (this.isModelLoading) return;
        this.isModelLoading = true;

        try {
            // Load MobileNet as the base model
            this.model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
            console.log('Base model loaded successfully');
        } catch (error) {
            console.error('Error loading model:', error);
        } finally {
            this.isModelLoading = false;
        }
    }

    async classifyImage(imageElement) {
        if (!this.model) await this.loadModel();
        
        // Convert image to tensor
        const tensor = tf.browser.fromPixels(imageElement)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .expandDims();

        // Normalize
        const normalized = tensor.div(255.0);

        // Get prediction
        const prediction = await this.model.predict(normalized).data();
        
        // Clean up
        tensor.dispose();
        normalized.dispose();

        // Process prediction (simplified for demo)
        const topPrediction = Array.from(prediction)
            .map((p, i) => ({ probability: p, label: this.labels[i] }))
            .sort((a, b) => b.probability - a.probability)[0];

        return {
            label: topPrediction.label,
            confidence: (topPrediction.probability * 100).toFixed(2)
        };
    }
}

// Carbon Footprint Calculator
class CarbonCalculator {
    constructor() {
        this.factors = {
            transportation: {
                car: 0.14, // kg CO2 per km
                bus: 0.08,
                train: 0.04,
                plane: 0.285
            },
            energy: {
                electricity: 0.5, // kg CO2 per kWh
                gas: 0.2,
                oil: 0.25
            },
            food: {
                meat: 6.0, // kg CO2 per meal
                vegetarian: 2.5,
                vegan: 1.5
            },
            waste: {
                landfill: 0.5, // kg CO2 per kg waste
                recycling: 0.1,
                composting: 0.05
            }
        };
    }

    calculateTransportation(mode, distance) {
        return this.factors.transportation[mode] * distance;
    }

    calculateEnergy(type, amount) {
        return this.factors.energy[type] * amount;
    }

    calculateFood(diet, meals) {
        return this.factors.food[diet] * meals;
    }

    calculateWaste(type, weight) {
        return this.factors.waste[type] * weight;
    }

    getTotalFootprint(data) {
        let total = 0;
        
        // Calculate transportation
        if (data.transportation) {
            Object.entries(data.transportation).forEach(([mode, distance]) => {
                total += this.calculateTransportation(mode, distance);
            });
        }

        // Calculate energy
        if (data.energy) {
            Object.entries(data.energy).forEach(([type, amount]) => {
                total += this.calculateEnergy(type, amount);
            });
        }

        // Calculate food
        if (data.food) {
            Object.entries(data.food).forEach(([diet, meals]) => {
                total += this.calculateFood(diet, meals);
            });
        }

        // Calculate waste
        if (data.waste) {
            Object.entries(data.waste).forEach(([type, weight]) => {
                total += this.calculateWaste(type, weight);
            });
        }

        return total.toFixed(2);
    }

    getRecommendations(footprint) {
        const recommendations = [];
        
        if (footprint > 10) {
            recommendations.push(
                "Consider using public transportation or carpooling",
                "Switch to energy-efficient appliances",
                "Reduce meat consumption",
                "Start composting organic waste"
            );
        } else if (footprint > 5) {
            recommendations.push(
                "Try walking or cycling for short distances",
                "Use natural lighting when possible",
                "Consider a more plant-based diet",
                "Increase recycling efforts"
            );
        } else {
            recommendations.push(
                "Great job! Keep up your eco-friendly habits",
                "Share your sustainable practices with others",
                "Look for new ways to reduce waste"
            );
        }

        return recommendations;
    }
}

    // Export the classes
    window.EcoClassifier = EcoClassifier;
    window.CarbonCalculator = CarbonCalculator;
}








// Initialize classifiers
window.ecoClassifier = null;
window.carbonCalculator = null;

// Handle recycling classification and chat integration
async function handleRecyclingClassification(imageFile) {
    const chatMessages = document.querySelector('.chat-messages');
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'chat-message system-message';
    loadingMessage.innerHTML = 'Analyzing image...';
    chatMessages.appendChild(loadingMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Create image element for classification
        const img = new Image();
        img.src = URL.createObjectURL(imageFile);
        await new Promise(resolve => img.onload = resolve);

        // Classify the image
        const result = await window.ecoClassifier.classifyImage(img);
        
        // Get recycling instructions
        const instructions = getRecyclingInstructions(result.label);
        
        // Remove loading message
        loadingMessage.remove();

        // Add classification result to chat
        const resultMessage = document.createElement('div');
        resultMessage.className = 'chat-message system-message';
        resultMessage.innerHTML = `
            <div class="recycling-result">
                <img src="${img.src}" style="max-width: 200px; border-radius: 8px; margin: 10px 0;">
                <h4>Classification Result:</h4>
                <p><strong>${result.label}</strong> (${result.confidence}% confidence)</p>
                <h4>Recycling Instructions:</h4>
                <p>${instructions}</p>
            </div>
        `;
        chatMessages.appendChild(resultMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Generate AI response about the classification
        const query = `The image was classified as ${result.label} with ${result.confidence}% confidence. Can you provide more detailed information about how to properly recycle or dispose of this type of item, and its environmental impact?`;
        await sendMessage(query, true);

    } catch (error) {
        console.error('Classification error:', error);
        loadingMessage.innerHTML = 'Sorry, there was an error analyzing the image. Please try again.';
    }
}

// Function to get recycling instructions
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



// Dynamically load required scripts if not already loaded
function loadEcoScripts(cb) {
  function loadScript(src, onload) {
    if ([...document.scripts].some(s => s.src.includes(src))) { onload(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = onload;
    document.head.appendChild(script);
  }
  loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0/dist/tf.min.js', () => {
    loadScript('components/ecoClassifier.js', cb || (() => {}));
  });
}

// Call this when the section loads
window.renderSection = function() {
  loadEcoScripts(() => {
    if (typeof window.initEcoFeatures === 'function') window.initEcoFeatures();
  });
};

// Moved logic from window.renderEcoSection into window.renderSection
loadEcoScripts(() => {
  if (typeof window.initEcoFeatures === 'function') window.initEcoFeatures();
});


// Function to initialize eco features
window.initEcoFeatures = function() {
    if (!window.ecoClassifier) {
        window.ecoClassifier = new EcoClassifier();
    }
    if (!window.carbonCalculator) {
        window.carbonCalculator = new CarbonCalculator();
    }
    
    // Initialize weather display
    if (typeof window.initEcoWeatherDisplay === 'function') {
        window.initEcoWeatherDisplay();
    }
  }
