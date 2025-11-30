import pandas as pd
import os

def filter_csv():
  # File paths
  input_path = './../data/openpowerlifting-2025-11-22-823f23d6.csv'
  output_path = './../data/openpowerlifting_filtered.csv'

  # The list of specific columns to keep
  columns_to_keep = [
    'Name', 'Sex', 'Event', 'Equipment', 'Age', 'BodyweightKg',
    'Best3SquatKg', 'Best3BenchKg', 'Best3DeadliftKg', 'TotalKg',
    'Dots', 'Wilks', 'Glossbrenner', 'Goodlift', 'Tested',
    'Country', 'State', 'Date'
  ]

  # List of allowed countries (including 'USA' as OpenPowerlifting uses that code)
  target_countries = [
    "Argentina", "Australia", "Brazil", "Canada", "China", "Germany",
    "India", "Mexico", "Netherlands", "New Zealand",
    "South Africa", "United Kingdom", "United States of America", "USA"
  ]

  print(f"Reading file from: {input_path}")

  try:
    # Read the CSV file
    df = pd.read_csv(input_path, low_memory=False)

    # Check for missing columns
    missing_columns = [col for col in columns_to_keep if col not in df.columns]
    if missing_columns:
      print(f"Warning: The following columns were not found: {missing_columns}")

    # 1. Filter Columns
    available_columns = [col for col in columns_to_keep if col in df.columns]
    df_filtered = df[available_columns]

    # 2. Filter Rows (Countries)
    if 'Country' in df_filtered.columns:
      initial_count = len(df_filtered)
      df_filtered = df_filtered[df_filtered['Country'].isin(target_countries)]
      print(f"Country Filter applied: Reduced from {initial_count} to {len(df_filtered)} rows.")

    # 3. Filter Rows (State is not Null/None)
    if 'State' in df_filtered.columns:
      count_before_state = len(df_filtered)

      # dropna removes rows where 'State' is NaN (Not a Number) or None
      df_filtered = df_filtered.dropna(subset=['State'])

      print(f"State Filter applied: Reduced from {count_before_state} to {len(df_filtered)} rows.")
    else:
      print("Warning: 'State' column missing, skipping state filter.")

    # Create the output directory
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Save the filtered data
    df_filtered.to_csv(output_path, index=False)

    print(f"Successfully filtered data.")
    print(f"Final row count: {len(df_filtered)}")
    print(f"Saved to: {output_path}")

  except FileNotFoundError:
    print(f"Error: The file '{input_path}' was not found.")
  except Exception as e:
    print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
  filter_csv()