import bpy
import json
import os

def export_vertices(filepath, use_selection=True, closed=False):
    """Export vertices from Blender objects to a JSON file."""
    points = []

    if use_selection:
        selected_objects = bpy.context.selected_objects
        if not selected_objects:
            print("No objects selected. Please select at least one mesh object.")
            return False
    else:
        selected_objects = bpy.context.scene.objects

    mesh_found = False
    for obj in selected_objects:
        if obj.type == 'MESH':
            mesh_found = True
            for vertex in obj.data.vertices:
                point = {
                    "x": vertex.co.x,
                    "y": vertex.co.z,   # Swap y and z axes
                    "z": -1 * vertex.co.y  # Swap y and z axes - Times negative one to face proper direction
                }
                points.append(point)

    if not mesh_found:
        print("No mesh objects found in selection.")
        return False

    data = {
        "points": points,
        "closed": closed
    }

    # Ensure the file extension is .json
    filepath = os.path.splitext(filepath)[0] + ".json"

    try:
        with open(filepath, 'w') as file:
            json.dump(data, file, indent=4)
        print(f"Successfully exported {len(points)} vertices to {filepath}")
        return True
    except Exception as e:
        print(f"Error writing file: {e}")
        return False

def main():
    """Main function to run the script."""
    # Check if we're running in Blender
    try:
        import bpy
    except ImportError:
        print("This script must be run from within Blender.")
        return

    # Get the current blend file path for default output location
    blend_filepath = bpy.data.filepath
    if blend_filepath:
        default_name = os.path.splitext(os.path.basename(blend_filepath))[0] + "_vertices.json"
        default_path = os.path.join(os.path.dirname(blend_filepath), default_name)
    else:
        default_path = "vertices.json"

    # Configuration - modify these as needed
    output_filepath = default_path
    export_selected_only = True  # Set to False to export all objects
    is_closed_curve = False      # Set to True if representing a closed curve

    # Run the export
    success = export_vertices(output_filepath, export_selected_only, is_closed_curve)
    
    if success:
        print("Export completed successfully!")
    else:
        print("Export failed!")

# Run the script
if __name__ == "__main__":
    main()