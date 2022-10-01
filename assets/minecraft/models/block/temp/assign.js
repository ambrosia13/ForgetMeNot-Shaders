const fs = require("fs");
const prompt = require("prompt-sync")();

let names = [];

fs.readdir(".", (err, files) => {
	for (let file of files) {
		if (!file.endsWith(".json")) continue;
		let content = fs.readFileSync(file);
		let json = JSON.parse(content);
		if (!json.elements) json.elements = [];
		json.elements.push({
			from: [ 1, 1, 1 ],
			to: [ 15, 15, 15 ],
			faces: {
				up:    { texture: "#marker" },
                down:  { texture: "#marker" }
			}
		});
		let marker_name = prompt(`Marker name for ${file}: `);
		if (!marker_name) continue;
		json.textures.marker = `minecraft:block/marker_${marker_name}`;
		fs.writeFileSync(file, JSON.stringify(json));
		names.push(marker_name);
	}
});

fs.writeFileSync("generated.txt", names.join("\n"));

