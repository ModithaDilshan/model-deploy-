extends Node3D

@export var model_resource_path: String = "res://Imported/user_model.glb"
@export var model_root_path: NodePath = ^"ModelRoot"
@export var fallback_mesh_path: NodePath = ^"ModelRoot/FallbackMesh"
@export var auto_rotate_speed_degrees: float = 15.0

var _current_instance: Node3D
var _model_loaded := false

func _ready() -> void:
	load_or_show_fallback()

func _process(delta: float) -> void:
	var pivot := get_node_or_null(model_root_path)
	if pivot:
		pivot.rotate_y(deg_to_rad(auto_rotate_speed_degrees) * delta)

func load_or_show_fallback() -> void:
	var model_root := get_node_or_null(model_root_path)
	if model_root == null:
		push_error("ModelLoader: ModelRoot node is missing.")
		return

	_clear_children(model_root)
	_model_loaded = false

	var fallback_mesh := get_node_or_null(fallback_mesh_path)
	if fallback_mesh:
		fallback_mesh.visible = true

	if not ResourceLoader.exists(model_resource_path):
		push_warning("ModelLoader: custom model not found at %s" % model_resource_path)
		return

	var resource := ResourceLoader.load(model_resource_path)
	if resource == null:
		push_warning("ModelLoader: failed to load resource %s" % model_resource_path)
		return

	if resource is PackedScene:
		var instance := resource.instantiate()
		model_root.add_child(instance)
		_current_instance = instance
		_model_loaded = true
	elif resource is Mesh:
		var mesh_instance := MeshInstance3D.new()
		mesh_instance.mesh = resource
		model_root.add_child(mesh_instance)
		_current_instance = mesh_instance
		_model_loaded = true
	else:
		push_warning("ModelLoader: Unsupported resource type %s" % resource)

	if _model_loaded and fallback_mesh:
		fallback_mesh.visible = false

func _clear_children(root: Node) -> void:
	for child in root.get_children():
		child.queue_free()

