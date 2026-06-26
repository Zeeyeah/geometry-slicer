import bpy
import json
import os
# Create an empty dictionary to store the data
myDataDict = {}

# Get the selected objects
selected_objects = bpy.context.selected_objects

# Add rounding option
round_to_decimal = 4  # Set to None to disable rounding

# Adjust dictionary structure to avoid nested common names
merge_similar_named_meshes = True  # Set to False to disable merging

# Iterate over the selected objects
for obj in selected_objects:
    collection_name = obj.users_collection[0].name
    
    # Extract the common name before the character
    common_name = obj.name.split(".")[0]
    
    # Determine the key for storing data based on merge option
    dict_key = common_name if merge_similar_named_meshes else collection_name
    
    # Check if the key exists in the dictionary
    if dict_key not in myDataDict:
        myDataDict[dict_key] = {'pos': [], 'scale': [], 'rot': []}
    
    # Append the position (converted to a list) to the array for the common name
    position = list([round(obj.location.x, round_to_decimal) if round_to_decimal else obj.location.x,
                     round(obj.location.z, round_to_decimal) if round_to_decimal else obj.location.z,
                     round(-obj.location.y, round_to_decimal) if round_to_decimal else -obj.location.y])
    scale = list([obj.scale[0], obj.scale[2], obj.scale[1]])  # Convert scale to list and adjust order to match the position
    
    # Extract the rotation as XYZ Euler angles from the world matrix
    rotation_matrix = obj.matrix_world.to_3x3().to_4x4()
    rotation_matrix.translation = (0, 0, 0)  # Remove translation component
    euler_angles = rotation_matrix.to_euler('XYZ')
    rotation = [euler_angles.x, euler_angles.y, euler_angles.z]

    myDataDict[dict_key]['pos'].append(position)
    myDataDict[dict_key]['scale'].append(scale)
    myDataDict[dict_key]['rot'].append(rotation)

# Convert the dictionary to a formatted JSON string
formatted_output = json.dumps(myDataDict, indent=4)

# Update file path logic to match export_edges
blend_filepath = bpy.data.filepath
output_path = "positions.json"
if blend_filepath:
    output_path = os.path.join(os.path.dirname(blend_filepath), output_path)
filepath = os.path.splitext(output_path)[0] + ".json"

# Save to JSON
try:
    with open(filepath, 'w') as f:
        f.write(formatted_output)
    print(f"Exported positions to {filepath}")
except Exception as e:
    print(f"Error writing file: {e}")