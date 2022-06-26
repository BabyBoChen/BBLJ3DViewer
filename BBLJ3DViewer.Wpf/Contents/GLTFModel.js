class GLTFModel {
    constructor() {
        this.meshes = [];
        this.name = 'unnamed';
        this.gltfFile = {};
    }

    dispose() {
        this.meshes.forEach(mesh => {
            mesh.geometry.dispose();
            mesh.geometry = undefined;
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
            mesh = undefined;
        });
    }
}