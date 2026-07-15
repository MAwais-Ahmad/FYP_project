import numpy as np
import pandas as pd
import os

# Set random seed for reproducibility
np.random.seed(42)

# Define categories
CATEGORIES = [
    'quick_careless',
    'slow_thorough',
    'concept_struggler',
    'fast_learner',
    'inconsistent_performer',
    'steady_achiever',
    'strategic_thinker',
    'ignorant_avoider'
]

# Generate synthetic samples per category
SAMPLES_PER_CATEGORY = 700  # Total 5600 records (200 original + 500 added per category)

def clip_value(val, min_val, max_val):
    return np.clip(val, min_val, max_val)

def generate_student_profiles():
    data = []

    for cat in CATEGORIES:
        for _ in range(SAMPLES_PER_CATEGORY):
            row = {'learner_category': cat}
            
            # Default values (overwritten below)
            skipped_questions = 0
            questions_answered = 7
            
            # 1. Category Specific Feature Generation
            if cat == 'quick_careless':
                # Fast decisions, low revisions, shallow reflection, overconfident, poor accuracy
                avg_decision_time = np.random.normal(22, 4)
                time_variance = np.random.normal(0.12, 0.04)
                rushed_decisions = np.random.poisson(3.8)
                overthinking_count = 0
                overtime_count = np.random.choice([0, 1], p=[0.9, 0.1])
                avg_time_to_start = np.random.normal(1.8, 0.5)
                time_trend = np.random.choice(['speeding_up', 'stable'], p=[0.6, 0.4])
                
                total_answer_changes = np.random.poisson(0.8)
                backtrack_count = np.random.poisson(0.3)
                confidence_rating = np.random.normal(8.4, 0.8)
                
                accuracy_score = np.random.beta(2.5, 4.5)  # average ~ 0.35
                reflection_depth = np.random.beta(2, 5)     # average ~ 0.28
                self_awareness = np.random.beta(2, 5)       # average ~ 0.28
                creativity_score = np.random.beta(3, 4)     # average ~ 0.42
                decision_style = 'impulsive'
                
            elif cat == 'slow_thorough':
                # Slow decisions, high revisions, deep reflection, high accuracy
                avg_decision_time = np.random.normal(108, 12)
                time_variance = np.random.normal(0.25, 0.08)
                rushed_decisions = 0
                overthinking_count = np.random.poisson(3.5)
                overtime_count = np.random.poisson(2.5)
                avg_time_to_start = np.random.normal(9.5, 1.8)
                time_trend = np.random.choice(['slowing_down', 'stable'], p=[0.5, 0.5])
                
                total_answer_changes = np.random.poisson(4.2)
                backtrack_count = np.random.poisson(3.1)
                confidence_rating = np.random.normal(7.6, 0.9)
                
                accuracy_score = np.random.beta(7.5, 2.0)  # average ~ 0.79
                reflection_depth = np.random.beta(8.0, 2.0) # average ~ 0.80
                self_awareness = np.random.beta(7.0, 2.0)   # average ~ 0.77
                creativity_score = np.random.beta(5.5, 3.5) # average ~ 0.61
                decision_style = 'deliberate'
                
            elif cat == 'concept_struggler':
                # Slow decisions, low accuracy, low confidence, flat progression, backtracking
                avg_decision_time = np.random.normal(102, 14)
                time_variance = np.random.normal(0.42, 0.12)
                rushed_decisions = np.random.choice([0, 1], p=[0.85, 0.15])
                overthinking_count = np.random.poisson(2.8)
                overtime_count = np.random.poisson(3.2)
                avg_time_to_start = np.random.normal(11.2, 2.5)
                time_trend = np.random.choice(['slowing_down', 'stable', 'speeding_up'], p=[0.4, 0.4, 0.2])
                
                total_answer_changes = np.random.poisson(4.5)
                backtrack_count = np.random.poisson(4.2)
                confidence_rating = np.random.normal(3.2, 0.8)
                
                accuracy_score = np.random.beta(2.2, 5.8)  # average ~ 0.27
                reflection_depth = np.random.beta(3.0, 5.0) # average ~ 0.37
                self_awareness = np.random.beta(2.5, 5.5)   # average ~ 0.31
                creativity_score = np.random.beta(2.0, 6.0) # average ~ 0.25
                decision_style = np.random.choice(['deliberate', 'balanced'], p=[0.7, 0.3])
                
            elif cat == 'fast_learner':
                # Fast decisions, high accuracy, high confidence
                avg_decision_time = np.random.normal(32, 5)
                time_variance = np.random.normal(0.14, 0.04)
                rushed_decisions = np.random.poisson(0.5)
                overthinking_count = 0
                overtime_count = 0
                avg_time_to_start = np.random.normal(2.5, 0.6)
                time_trend = 'speeding_up'
                
                total_answer_changes = np.random.poisson(1.2)
                backtrack_count = np.random.poisson(0.4)
                confidence_rating = np.random.normal(9.1, 0.6)
                
                accuracy_score = np.random.beta(8.5, 1.2)  # average ~ 0.88
                reflection_depth = np.random.beta(6.5, 3.5) # average ~ 0.65
                self_awareness = np.random.beta(8.0, 2.0)   # average ~ 0.80
                creativity_score = np.random.beta(7.0, 3.0) # average ~ 0.70
                decision_style = 'balanced'
                
            elif cat == 'strategic_thinker':
                # Balanced/deliberate, high accuracy, very deep reflection and creativity
                avg_decision_time = np.random.normal(68, 8)
                time_variance = np.random.normal(0.18, 0.05)
                rushed_decisions = 0
                overthinking_count = np.random.choice([0, 1], p=[0.75, 0.25])
                overtime_count = np.random.choice([0, 1], p=[0.8, 0.2])
                avg_time_to_start = np.random.normal(6.2, 1.2)
                time_trend = 'stable'
                
                total_answer_changes = np.random.poisson(2.1)
                backtrack_count = np.random.poisson(1.1)
                confidence_rating = np.random.normal(8.8, 0.6)
                
                accuracy_score = np.random.beta(8.2, 1.8)  # average ~ 0.82
                reflection_depth = np.random.beta(8.5, 1.5) # average ~ 0.85
                self_awareness = np.random.beta(8.2, 1.8)   # average ~ 0.82
                creativity_score = np.random.beta(8.5, 1.5) # average ~ 0.85
                decision_style = 'deliberate'
                
            elif cat == 'inconsistent_performer':
                # Erratic speed variance, erratic accuracy, high backtrack/changes
                avg_decision_time = np.random.normal(58, 12)
                time_variance = np.random.uniform(0.55, 0.85)  # Very high variance
                rushed_decisions = np.random.poisson(2.2)
                overthinking_count = np.random.poisson(1.8)
                overtime_count = np.random.poisson(1.5)
                avg_time_to_start = np.random.normal(5.8, 2.0)
                time_trend = np.random.choice(['speeding_up', 'slowing_down', 'stable'], p=[0.33, 0.33, 0.34])
                
                total_answer_changes = np.random.poisson(5.8)
                backtrack_count = np.random.poisson(3.8)
                confidence_rating = np.random.normal(5.5, 1.2)
                
                accuracy_score = np.random.uniform(0.35, 0.75) # High variance
                reflection_depth = np.random.beta(4.0, 4.0)   # average ~ 0.50
                self_awareness = np.random.beta(4.0, 4.0)     # average ~ 0.50
                creativity_score = np.random.beta(4.0, 4.0)   # average ~ 0.50
                decision_style = np.random.choice(['impulsive', 'deliberate', 'balanced'])
                
            elif cat == 'steady_achiever':
                # Very consistent pacing, solid moderate metrics
                avg_decision_time = np.random.normal(62, 6)
                time_variance = np.random.normal(0.16, 0.04)
                rushed_decisions = np.random.choice([0, 1], p=[0.9, 0.1])
                overthinking_count = 0
                overtime_count = np.random.choice([0, 1], p=[0.92, 0.08])
                avg_time_to_start = np.random.normal(5.1, 0.8)
                time_trend = 'stable'
                
                total_answer_changes = np.random.poisson(1.8)
                backtrack_count = np.random.poisson(0.9)
                confidence_rating = np.random.normal(7.1, 0.5)
                
                accuracy_score = np.random.beta(6.8, 3.2)  # average ~ 0.68
                reflection_depth = np.random.beta(6.5, 3.5) # average ~ 0.65
                self_awareness = np.random.beta(6.5, 3.5)   # average ~ 0.65
                creativity_score = np.random.beta(6.0, 4.0) # average ~ 0.60
                decision_style = 'balanced'
                
            elif cat == 'ignorant_avoider':
                # High skipped questions, low questions answered, rapid clicks, 0 confidence/reflection
                skipped_questions = np.random.randint(3, 6)  # 3 to 5 skips
                questions_answered = 7 - skipped_questions
                
                avg_decision_time = np.random.normal(12, 3)  # lightning fast click-throughs
                time_variance = np.random.normal(0.15, 0.05)
                rushed_decisions = np.random.poisson(4.8)
                overthinking_count = 0
                overtime_count = 0
                avg_time_to_start = np.random.normal(1.1, 0.3)
                time_trend = 'speeding_up'
                
                total_answer_changes = np.random.choice([0, 1], p=[0.92, 0.08])
                backtrack_count = 0
                confidence_rating = 0.0  # forced to 0 due to skipping behavioral gatekeeper
                
                accuracy_score = np.random.beta(1.0, 6.0)  # very low accuracy
                reflection_depth = 0.0
                self_awareness = 0.0
                learning_orientation = 0.0
                creativity_score = 0.0
                decision_style = 'impulsive'
                
            # Compute learning orientation if not set (for non-avoiders)
            if cat != 'ignorant_avoider':
                # Higher accuracy and reflection depth generally correlate with learning orientation
                base_lo = 0.4 * accuracy_score + 0.4 * reflection_depth + np.random.normal(0.1, 0.05)
                learning_orientation = clip_value(base_lo, 0.0, 1.0)
            
            # Post-processing and clipping bounds
            row['avg_decision_time'] = round(clip_value(avg_decision_time, 2.0, 300.0), 1)
            row['time_variance'] = round(clip_value(time_variance, 0.01, 1.0), 3)
            row['rushed_decisions'] = int(clip_value(rushed_decisions, 0, 7))
            row['overthinking_count'] = int(clip_value(overthinking_count, 0, 7))
            row['overtime_count'] = int(clip_value(overtime_count, 0, 7))
            row['avg_time_to_start'] = round(clip_value(avg_time_to_start, 0.1, 60.0), 1)
            row['time_trend'] = time_trend
            
            row['total_answer_changes'] = int(clip_value(total_answer_changes, 0, 20))
            row['backtrack_count'] = int(clip_value(backtrack_count, 0, 15))
            row['confidence_rating'] = round(clip_value(confidence_rating, 0.0, 10.0), 1)
            row['questions_answered'] = int(questions_answered)
            row['skipped_questions'] = int(skipped_questions)
            row['decision_style'] = decision_style
            
            row['accuracy_score'] = round(clip_value(accuracy_score, 0.0, 1.0), 3)
            row['reflection_depth'] = round(clip_value(reflection_depth, 0.0, 1.0), 3)
            row['self_awareness'] = round(clip_value(self_awareness, 0.0, 1.0), 3)
            row['learning_orientation'] = round(clip_value(learning_orientation, 0.0, 1.0), 3)
            row['creativity_score'] = round(clip_value(creativity_score, 0.0, 1.0), 3)
            
            data.append(row)
            
    return pd.DataFrame(data)

if __name__ == '__main__':
    print("Generating synthetic student profile data...")
    df = generate_student_profiles()
    
    # Create ml directory if it doesn't exist
    os.makedirs('ml', exist_ok=True)
    
    csv_path = 'ml/student_behavior_data.csv'
    df.to_csv(csv_path, index=False)
    print(f"Successfully generated {len(df)} samples and saved to {csv_path}")
    print("\nSample counts per category:")
    print(df['learner_category'].value_counts())
