document.addEventListener("DOMContentLoaded", function () {

    let uRangeStart;
    let uRangeEnd;
    let vRangeStart;
    let vRangeEnd;

    let uRange = [0, 20];
    let vRange = [0 , 20];
    let uPrecision = 0.05;
    let vPrecision = 0.05;
    let aa = 0.5;

    document.getElementById("button").addEventListener("click", getNumbers);

    const uPrecisionValueSpan = document.getElementById('uPrecisionValue');
    uPrecisionValueSpan.textContent = `${uPrecision}`;

    document.getElementById("uPrecision").addEventListener("input", function () {
        uPrecision = this.value;
        uPrecisionValueSpan.textContent = `${uPrecision}`;
    });


    const vPrecisionValueSpan = document.getElementById('vPrecisionValue');
    vPrecisionValueSpan.textContent = `${vPrecision}`;

    document.getElementById("vPrecision").addEventListener("input", function () {
        vPrecision = this.value;
        vPrecisionValueSpan.textContent = `${vPrecision}`;
    });

    const aaPrecisionValueSpan = document.getElementById('aaPrecisionValue');
    aaPrecisionValueSpan.textContent = `${aa}`;

    document.getElementById("aaValue").addEventListener("input", function () {
        aa = this.value;
        aaPrecisionValueSpan.textContent = `${aa}`;
    });

    function getNumbers() {
        const uRangeStartInput = document.getElementById("uRangeStart").value;
        const uRangeEndInput = document.getElementById("uRangeEnd").value;
        const vRangeStartInput = document.getElementById("vRangeStart").value;
        const vRangeEndInput = document.getElementById("vRangeEnd").value;


        // Convert inputs to integers
        uRangeStart = parseInt(uRangeStartInput);
        uRangeEnd = parseInt(uRangeEndInput);
        vRangeStart = parseInt(vRangeStartInput);
        vRangeEnd = parseInt(vRangeEndInput);

        uRange = [uRangeStart, uRangeEnd];
        vRange = [vRangeStart, vRangeEnd];
    }

    const canvas = document.getElementById("webgl-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    // Vertex and fragment shader source code
    const vertexShaderSource = `
        attribute vec4 a_position;
        uniform mat4 u_matrix;
        void main() {
            gl_Position = u_matrix * a_position;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red color
        }
    `;

    // Compile shaders
    function compileShader(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`);
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link shaders into a program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(`Program linking error: ${gl.getProgramInfoLog(program)}`);
        return;
    }

    gl.useProgram(program);

    // Create buffer and set vertices based on the parametrization
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    function createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa) {
        // Create an empty array to store the vertices.
        const verticesBreathable = [];

        // Loop over the u and v variables.
        for (let u = uRange[0]; u <= uRange[1]; u += uPrecision) {
            for (let v = vRange[0]; v <= vRange[1]; v += vPrecision) {
                // Calculate the denominator.
                const wsqr = 1 - aa * aa;
                const w = Math.sqrt(wsqr);
                const denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));

                const x = -u + (2 * wsqr * Math.cosh(aa * u) * Math.sinh(aa * u) / denom);
                const y = 2 * w * Math.cosh(aa * u) * (-(w * Math.cos(v) * Math.cos(w * v)) - (Math.sin(v) * Math.sin(w * v))) / denom;
                const z = 2 * w * Math.cosh(aa * u) * (-(w * Math.sin(v) * Math.cos(w * v)) + (Math.cos(v) * Math.sin(w * v))) / denom;

                // Add the vertex to the array.
                verticesBreathable.push(vec4(x, y, z, 1.0));
            }
        }

        // Return the array of vertices.
        return verticesBreathable;
    }

    let vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);

    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    // Get attribute location and enable it
    const positionAttribLocation = gl.getAttribLocation(program, "a_position");
    gl.vertexAttribPointer(positionAttribLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);

    gl.enable(gl.DEPTH_TEST);

    // Set up the perspective matrix
    var projectionMatrix = mat4();
    projectionMatrix = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 10000);

    // Set up the model-view matrix
    var modelViewMatrix = mat4();
    modelViewMatrix = lookAt(vec3(0, 0, -1000), vec3(0, 0, 0), vec3(0, 1, 0));

    var matrix = mat4();
    matrix = mult(projectionMatrix, modelViewMatrix);

    // Set up the perspective matrix
    const matrixLocation = gl.getUniformLocation(program, "u_matrix");

    gl.uniformMatrix4fv(matrixLocation, false, flatten(matrix));

    render();

    function render() {
        // Set the WebGL rendering context clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT);

        // console.log(`uRange: ${uRange} vRange: ${vRange}, uPrecision: ${uPrecision} vPrecision: ${vPrecision} aa: ${aa}`);
        vertices = structuredClone(createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa));
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, vertices.length / 4);
        requestAnimationFrame(render)
    }
});