import json
import pandas as pd
import re

def filter_geojson(input_filename, output_filename):
    # List of geounits to remove
    # Make sure these match the exact spelling and capitalization in your JSON file
    units_to_remove = [
        "Scotland",
        "Wales",
        "Northern Ireland"
    ]

    try:
        print(f"Reading from {input_filename}...")

        with open(input_filename, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Ensure this is actually a FeatureCollection
        if 'features' not in data:
            print("Error: The file does not look like a valid GeoJSON FeatureCollection (missing 'features' key).")
            return

        original_count = len(data['features'])

        # Create a new list of features that DO NOT match the removal criteria
        filtered_features = []

        for feature in data['features']:
            properties = feature.get('properties', {})

            # We use .get() here to avoid errors if 'geounit' is missing from a specific feature
            geounit = properties.get('geonunit')

            # Keep the feature if its geounit is NOT in our removal list
            if geounit not in units_to_remove:
                filtered_features.append(feature)

        # Update the data object with the new list
        data['features'] = filtered_features

        removed_count = original_count - len(filtered_features)

        # Save the new file
        print(f"Saving to {output_filename}...")
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2) # indent=2 makes it human-readable

        print(f"Success! Removed {removed_count} features.")
        print(f"New file created: {output_filename}")

    except FileNotFoundError:
        print(f"Error: Could not find the file '{input_filename}'. Make sure it is in the same folder as this script.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


# Clean country geometries for South Africa, Netherlands, and New Zealand
def clean_country_geometries(input_filename, output_filename):
  # --- CONFIGURATION ---
  # South Africa: Remove Prince Edward Islands (South of -40)
  SA_LAT_CUTOFF = -40.0

  # Netherlands: Remove Caribbean islands (South of 40)
  NL_LAT_CUTOFF = 40.0

  # New Zealand: Remove Southern Islands (South of 47°30' = -47.5)
  NZ_LAT_CUTOFF = -47.5

  try:
    print(f"Reading {input_filename}...")
    with open(input_filename, 'r', encoding='utf-8') as f:
      data = json.load(f)

    features_modified = 0
    features_removed = 0
    countries_found = []

    # We will build a new list of features to allow deleting entire features (Polygons)
    cleaned_features = []

    for feature in data['features']:
      props = feature.get('properties', {})
      geometry = feature.get('geometry')

      # If no geometry, just keep it and move on
      if not geometry:
        cleaned_features.append(feature)
        continue

      # Get likely name fields
      admin = props.get('admin', '')
      name = props.get('name', '')
      name_en = props.get('name_en', '')
      geounit = props.get('geounit', '')

      all_names = f"{admin} {name} {name_en} {geounit}"

      # Default decision is to keep the feature unless we find a reason to drop it
      keep_feature = True

      # Debugging: Track which countries we are touching
      if "South Africa" in all_names or "Netherlands" in all_names or "New Zealand" in all_names:
        countries_found.append(name or admin)

      # ==========================================
      # 1. SOUTH AFRICA FIX
      # ==========================================
      if "South Africa" in all_names:
        # --- MultiPolygon Logic (Collection of islands) ---
        if geometry['type'] == 'MultiPolygon':
          original_polygons = geometry['coordinates']
          new_polygons = []
          for polygon in original_polygons:
            if polygon[0][0][1] > SA_LAT_CUTOFF:
              new_polygons.append(polygon)
            else:
              print(f"  - [South Africa] Removing part (MultiPolygon) at lat: {polygon[0][0][1]:.2f}")

          if len(new_polygons) < len(original_polygons):
            geometry['coordinates'] = new_polygons
            features_modified += 1
            # If we removed ALL parts, drop the feature entirely
            if len(new_polygons) == 0:
              keep_feature = False

        # --- Polygon Logic (Single island feature) ---
        elif geometry['type'] == 'Polygon':
          # Check the single polygon's latitude
          lat = geometry['coordinates'][0][0][1]
          if lat <= SA_LAT_CUTOFF:
            print(f"  - [South Africa] Removing entire feature (Polygon) at lat: {lat:.2f}")
            keep_feature = False

      # ==========================================
      # 2. NETHERLANDS FIX
      # ==========================================
      elif "Netherlands" in all_names:
        if geometry['type'] == 'MultiPolygon':
          original_polygons = geometry['coordinates']
          new_polygons = []
          for polygon in original_polygons:
            if polygon[0][0][1] > NL_LAT_CUTOFF:
              new_polygons.append(polygon)
            else:
              print(f"  - [Netherlands] Removing part (MultiPolygon) at lat: {polygon[0][0][1]:.2f}")

          if len(new_polygons) < len(original_polygons):
            geometry['coordinates'] = new_polygons
            features_modified += 1
            if len(new_polygons) == 0: keep_feature = False

        elif geometry['type'] == 'Polygon':
          lat = geometry['coordinates'][0][0][1]
          if lat <= NL_LAT_CUTOFF:
            print(f"  - [Netherlands] Removing entire feature (Polygon) at lat: {lat:.2f}")
            keep_feature = False

      # ==========================================
      # 3. NEW ZEALAND FIX
      # ==========================================
      elif "New Zealand" in all_names:
        if geometry['type'] == 'MultiPolygon':
          original_polygons = geometry['coordinates']
          new_polygons = []
          for polygon in original_polygons:
            lon = polygon[0][0][0]
            lat = polygon[0][0][1]

            # NZ Logic: Keep if Positive Longitude AND North of -47.5
            if lon > 0 and lat > NZ_LAT_CUTOFF:
              new_polygons.append(polygon)
            else:
              reason = "West/Chatham" if lon <= 0 else "Too South"
              print(f"  - [New Zealand] Removing part ({reason}) at {lon:.2f}, {lat:.2f}")

          if len(new_polygons) < len(original_polygons):
            geometry['coordinates'] = new_polygons
            features_modified += 1
            if len(new_polygons) == 0: keep_feature = False

        elif geometry['type'] == 'Polygon':
          lon = geometry['coordinates'][0][0][0]
          lat = geometry['coordinates'][0][0][1]

          if lon <= 0 or lat <= NZ_LAT_CUTOFF:
            reason = "West/Chatham" if lon <= 0 else "Too South"
            print(f"  - [New Zealand] Removing feature ({reason}) at {lon:.2f}, {lat:.2f}")
            keep_feature = False

      # End of loop: Add to new list if we decided to keep it
      if keep_feature:
        cleaned_features.append(feature)
      else:
        features_removed += 1

    # ==========================================
    # SAVE FILE
    # ==========================================
    data['features'] = cleaned_features # Replace the old list with the cleaned one

    print("\n--- Summary ---")
    print(f"Found match candidates in file: {list(set(countries_found))}")

    if features_modified > 0 or features_removed > 0:
      print(f"Saving cleaned data to {output_filename}...")
      with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(data, f)
      print(f"Done! Modified {features_modified} geometries and deleted {features_removed} entire features.")
    else:
      print("No features were modified. Check the 'Found match candidates' list above to see if the script is finding the countries at all.")

  except Exception as e:
    print(f"Error: {e}")



  def clean_feature_properties(properties):
    """
    Cleaning utility: Removes language-specific 'name_' keys (e.g., name_fr, name_de)
    except for 'name_en'. Preserves non-language attributes like 'name_len'.
    """
    # Regex to match name_ followed by 2 or 3 lowercase letters (typical ISO codes)
    lang_pattern = re.compile(r"^name_[a-z]{2,3}$")

    keys_to_remove = []
    for key in properties:
      if lang_pattern.match(key):
        # We explicitly KEEP 'name_en'.
        # We also keep structural keys like 'name_len' or 'name_alt' if they match the regex,
        # unless you specifically want those removed too.
        if key == "name_en":
          continue
        if key in ["name_alt", "name_len", "name_local"]:
          continue

        keys_to_remove.append(key)

    for key in keys_to_remove:
      del properties[key]

    return properties

class PostalPropertyManager:
  def __init__(self):
    # Initialize the data structure based on your uploaded images
    # Keys are Country names, Values are lists of State/Province codes
    self.raw_data = {
      "New Zealand": ["AKL", "BOP", "CAN", "HKB", "MBH", "NTL", "WGN", "WKO"],
      "India": ["CG", "JH", "MH", "MP", "OR", "RJ", "WB"],
      "China": ["AH", "FJ", "GD", "HEB", "HEN", "HUB", "HUN", "JL", "JS", "JX", "LN", "SD", "YN", "ZJ"],
      "Mexico": ["AG", "BC", "BS", "CH", "CM", "CO", "CS", "DF", "EM", "GR", "GT", "HG", "JA", "MO", "NL", "QR", "QT", "SI", "SL", "SO", "TB", "TM", "VE", "YU"],
      "South Africa": ["EC", "FS", "GT", "KZN", "MP", "NC", "NW", "WC"],
      "Argentina": ["BA", "CB", "CN", "ER", "JY", "LP", "MN", "MZ", "NQ", "RN", "SA", "SC", "SE", "SF", "SJ", "SL", "TM"],
      "Australia": ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"],
      "Germany": ["BB", "BW", "BY", "HE", "MV", "NI", "NRW", "RP"],
      "Netherlands": ["FL", "GE", "NH", "UT", "ZH"],
      "Brazil": ["AM", "AP", "BA", "DF", "ES", "GO", "MG", "MS", "MT", "PA", "PB", "PE", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SP"]
    }
    self.dataframes = {}
    self._initialize_dataframes()

  def _initialize_dataframes(self):
    """Creates a DataFrame for each country with 'Abc' as the default value."""
    for country, states in self.raw_data.items():
      # Create a dataframe with one row (the Country) and columns (the States)
      df = pd.DataFrame([["Abc"] * len(states)], columns=states, index=[country])
      self.dataframes[country] = df

  def update_property(self, country, state_code, new_value):
    """Updates a specific state's postal property."""
    if country not in self.dataframes:
      print(f"Error: Country '{country}' not found.")
      return

    df = self.dataframes[country]

    if state_code == "ALL":
      df.loc[country, :] = new_value
      print(f"Updated ALL states in {country} to '{new_value}'.")
    elif state_code in df.columns:
      df.at[country, state_code] = new_value
      print(f"Updated {country} -> {state_code} to '{new_value}'.")
    else:
      print(f"Error: State code '{state_code}' not found in {country}.")

  def export_data(self):
    """Helper to print all dataframes (or you could save to CSV here)."""
    for country, df in self.dataframes.items():
      print(f"\n--- {country} ---")
      print(df.to_string())

if __name__ == "__main__":
    # You can change these filenames if needed
    # input_file = './data/countries.json'
    # output_file = './data/countries_filtered.json'
    #
    # filter_geojson(input_file, output_file)
    clean_country_geometries('./data/countries.json', './data/countries_cleaned.json')
