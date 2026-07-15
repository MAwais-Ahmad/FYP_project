import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import json
import os

def serialize_tree(decision_tree, feature_names):
    tree_ = decision_tree.tree_
    # Convert classes to plain Python strings so JSON keys are class name strings, not numpy types
    classes = [str(c) for c in decision_tree.classes_]
    
    def recurse(node):
        # In sklearn, leaf nodes have children_left[node] == -1
        if tree_.children_left[node] != -1:  # Split node
            feature_name = feature_names[tree_.feature[node]]
            threshold = float(tree_.threshold[node])
            left = recurse(tree_.children_left[node])
            right = recurse(tree_.children_right[node])
            return {
                "type": "split",
                "feature": feature_name,
                "threshold": threshold,
                "left": left,
                "right": right
            }
        else:  # Leaf node — KEY FIX: use class name strings, not numeric indices
            values = tree_.value[node][0]
            total = float(sum(values))
            # classes[i] is now "quick_careless", "slow_thorough" etc. — string keys
            probabilities = {classes[i]: float(values[i] / total) for i in range(len(classes))}
            predicted_class = classes[int(np.argmax(values))]
            return {
                "type": "leaf",
                "predicted_class": predicted_class,
                "probabilities": probabilities
            }
            
    return recurse(0)

def train_and_export():
    # 1. Load data
    csv_path = 'ml/student_behavior_data.csv'
    if not os.path.exists(csv_path):
        print(f"Error: Dataset {csv_path} not found. Please run generate_synthetic_data.py first.")
        return
        
    df = pd.read_csv(csv_path)
    
    # 2. Encode categorical columns explicitly
    # Maps are saved to ensure exact matching in JS
    time_trend_map = {'speeding_up': 0, 'slowing_down': 1, 'stable': 2}
    decision_style_map = {'impulsive': 0, 'deliberate': 1, 'balanced': 2}
    
    df['time_trend'] = df['time_trend'].map(time_trend_map)
    df['decision_style'] = df['decision_style'].map(decision_style_map)
    
    # Target and features
    X = df.drop(columns=['learner_category'])
    y = df['learner_category']
    
    feature_names = list(X.columns)
    
    # 3. 80/20 Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # 4. Train Random Forest
    # Limit depth and estimators to ensure lightweight JSON file and easy tree traversal
    clf = RandomForestClassifier(
        n_estimators=30, 
        max_depth=7, 
        min_samples_split=4,
        random_state=42
    )
    clf.fit(X_train, y_train)
    
    # 5. Evaluate accuracy
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print("\n" + "="*50)
    print(f"Random Forest Model Accuracy on 20% Test Set: {accuracy * 100:.2f}%")
    print("="*50)
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature Importances (Pareto Principle verification)
    print("\nFeature Importances:")
    importances = clf.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    # Verify how top ~20% of features explain ~80% of classification decisions
    cumulative_importance = 0
    for f in range(X.shape[1]):
        feature_idx = indices[f]
        cumulative_importance += importances[feature_idx]
        print(f"{f+1}. {feature_names[feature_idx]}: {importances[feature_idx]:.4f} (Cumulative: {cumulative_importance:.4f})")
        
    # 6. Export all trees to JSON
    forest_json = {
        "model_name": "AITA_Random_Forest_Classifier",
        "accuracy": float(accuracy),
        "feature_names": feature_names,
        "classes": list(clf.classes_),
        "categorical_encoding": {
            "time_trend": time_trend_map,
            "decision_style": decision_style_map
        },
        "trees": [serialize_tree(estimator, feature_names) for estimator in clf.estimators_]
    }
    
    json_path = 'ml/random_forest_model.json'
    with open(json_path, 'w') as f:
        json.dump(forest_json, f, indent=2)
        
    print(f"\nModel successfully exported as JSON to {json_path}")

if __name__ == '__main__':
    train_and_export()
