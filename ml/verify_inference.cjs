const fs = require('fs');
const path = require('path');

// 1. Load model config
const modelPath = path.join(__dirname, 'random_forest_model.json');
if (!fs.existsSync(modelPath)) {
    console.error("Error: random_forest_model.json not found. Please train the model first.");
    process.exit(1);
}

const forest = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
console.log(`Loaded ${forest.model_name} with test accuracy: ${(forest.accuracy * 100).toFixed(2)}%`);
console.log(`Features expected:`, forest.feature_names);
console.log(`Classes target:`, forest.classes);

// 2. Client-side Decision Tree Traversal Engine
function traverseTree(node, featureVector) {
    if (node.type === 'leaf') {
        return node.probabilities;
    }
    
    const value = featureVector[node.feature];
    if (value === undefined) {
        throw new Error(`Feature value for '${node.feature}' is missing in input vector.`);
    }
    
    // Traversal decision logic: Left is <= threshold, Right is > threshold
    if (value <= node.threshold) {
        return traverseTree(node.left, featureVector);
    } else {
        return traverseTree(node.right, featureVector);
    }
}

function predict(featureVector) {
    // Standardize categorical encodings to numeric
    const processedVector = { ...featureVector };
    
    const tt_val = processedVector.time_trend;
    if (typeof tt_val === 'string') {
        processedVector.time_trend = forest.categorical_encoding.time_trend[tt_val];
    }
    
    const ds_val = processedVector.decision_style;
    if (typeof ds_val === 'string') {
        processedVector.decision_style = forest.categorical_encoding.decision_style[ds_val];
    }
    
    // Accumulate probabilities from all trees
    const classSums = {};
    forest.classes.forEach(c => { classSums[c] = 0; });
    
    forest.trees.forEach(tree => {
        const probs = traverseTree(tree, processedVector);
        for (const c in probs) {
            classSums[c] += probs[c];
        }
    });
    
    // Compute average probabilities (confidence scores)
    const confidence = {};
    let bestClass = null;
    let maxConf = -1;
    
    const numTrees = forest.trees.length;
    for (const c in classSums) {
        const avgProb = classSums[c] / numTrees;
        confidence[c] = parseFloat(avgProb.toFixed(3));
        if (avgProb > maxConf) {
            maxConf = avgProb;
            bestClass = c;
        }
    }
    
    // Sort secondary classes for blend prediction
    const sortedClasses = Object.entries(confidence)
        .sort((a, b) => b[1] - a[1]);
        
    return {
        primary_category: bestClass,
        primary_confidence: maxConf,
        all_confidences: confidence,
        sorted: sortedClasses
    };
}

// 3. Test verification with mock student vectors
const testCases = [
    {
        name: "Mock Student A (Quick but Careless)",
        vector: {
            avg_decision_time: 19.5,
            time_variance: 0.11,
            rushed_decisions: 4,
            overthinking_count: 0,
            overtime_count: 0,
            avg_time_to_start: 1.5,
            time_trend: 'speeding_up',
            total_answer_changes: 0,
            backtrack_count: 0,
            confidence_rating: 8.5,
            questions_answered: 7,
            skipped_questions: 0,
            decision_style: 'impulsive',
            accuracy_score: 0.35,
            reflection_depth: 0.25,
            self_awareness: 0.30,
            learning_orientation: 0.20,
            creativity_score: 0.40
        }
    },
    {
        name: "Mock Student B (Strategic Thinker)",
        vector: {
            avg_decision_time: 71.0,
            time_variance: 0.16,
            rushed_decisions: 0,
            overthinking_count: 0,
            overtime_count: 1,
            avg_time_to_start: 5.5,
            time_trend: 'stable',
            total_answer_changes: 2,
            backtrack_count: 1,
            confidence_rating: 9.0,
            questions_answered: 7,
            skipped_questions: 0,
            decision_style: 'deliberate',
            accuracy_score: 0.85,
            reflection_depth: 0.88,
            self_awareness: 0.85,
            learning_orientation: 0.85,
            creativity_score: 0.90
        }
    },
    {
        name: "Mock Student C (Ignorant/Avoider)",
        vector: {
            avg_decision_time: 11.5,
            time_variance: 0.14,
            rushed_decisions: 5,
            overthinking_count: 0,
            overtime_count: 0,
            avg_time_to_start: 0.9,
            time_trend: 'speeding_up',
            total_answer_changes: 0,
            backtrack_count: 0,
            confidence_rating: 0.0,
            questions_answered: 3,
            skipped_questions: 4,
            decision_style: 'impulsive',
            accuracy_score: 0.15,
            reflection_depth: 0.0,
            self_awareness: 0.0,
            learning_orientation: 0.0,
            creativity_score: 0.0
        }
    }
];

console.log("\nRunning Client-Side Simulation Classifier...\n");
testCases.forEach(tc => {
    console.log(`--------------------------------------------------`);
    console.log(`Running inference for: ${tc.name}`);
    const result = predict(tc.vector);
    console.log(`Result: Primary Category -> \x1b[32m${result.primary_category}\x1b[0m (Confidence: ${(result.primary_confidence * 100).toFixed(1)}%)`);
    console.log(`Top 3 Class Matches:`);
    result.sorted.slice(0, 3).forEach(([cls, conf]) => {
        console.log(` - ${cls}: ${(conf * 100).toFixed(1)}%`);
    });
});
