// Image Classification for Recyclables
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
