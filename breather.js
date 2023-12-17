document.addEventListener("DOMContentLoaded", function () {

    // Variables to track the initial mouse position
    let startMouseX = 0;
    let startMouseY = 0;

    // Variables to track the accumulated rotation angles
    let totalRotationX = 0;
    let totalRotationY = 0;

    var isMouseDown = false;

    // Event handlers
    function onMouseDown(event) {
        isMouseDown = true;

        startMouseX = event.clientX;
        startMouseY = event.clientY;
    }

    function onMouseMove(event) {

        if (isMouseDown) {
            const deltaX = event.clientX - canvas.getBoundingClientRect().left - startMouseX;
            const deltaY = event.clientY - canvas.getBoundingClientRect().top - startMouseY;

            // Sensitivity factor to control rotation speed
            const sensitivity = 0.2;

            // Calculate rotation angles
            const rotationX = -deltaY * sensitivity;
            const rotationY = -deltaX * sensitivity;

            // Update total rotation angles
            totalRotationX = rotationX;
            totalRotationY = rotationY;
        }
    }

    function onMouseUp(event) {
        isMouseDown = false;
        totalRotationX = 0;
        totalRotationY = 0;
    }

    // Attach event listeners
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    let uRangeStart;
    let uRangeEnd;
    let vRangeStart;
    let vRangeEnd;

    let changed = false;

    let uRange = [-16, 16];
    let vRange = [-23, 23];
    let uPrecision = 0.05;
    let vPrecision = 0.05;
    let aa = 0.5;

    document.getElementById("button").addEventListener("click", getNumbers);

    const uPrecisionValueSpan = document.getElementById('uPrecisionValue');
    uPrecisionValueSpan.textContent = `${uPrecision}`;

    document.getElementById("uPrecision").addEventListener("input", function () {
        uPrecision = this.value;
        uPrecisionValueSpan.textContent = `${uPrecision}`;
        changed = true;
    });


    const vPrecisionValueSpan = document.getElementById('vPrecisionValue');
    vPrecisionValueSpan.textContent = `${vPrecision}`;

    document.getElementById("vPrecision").addEventListener("input", function () {
        vPrecision = this.value;
        vPrecisionValueSpan.textContent = `${vPrecision}`;
        changed = true;
    });

    const aaPrecisionValueSpan = document.getElementById('aaPrecisionValue');
    aaPrecisionValueSpan.textContent = `${aa}`;

    document.getElementById("aaValue").addEventListener("input", function () {
        aa = this.value;
        aaPrecisionValueSpan.textContent = `${aa}`;
        changed = true;
    });

    function getNumbers() {
        const uRangeStartInput = document.getElementById("uRangeStart").value;
        const uRangeEndInput = document.getElementById("uRangeEnd").value;
        const vRangeStartInput = document.getElementById("vRangeStart").value;
        const vRangeEndInput = document.getElementById("vRangeEnd").value;

        uRangeStart = parseInt(uRangeStartInput);
        uRangeEnd = parseInt(uRangeEndInput);
        vRangeStart = parseInt(vRangeStartInput);
        vRangeEnd = parseInt(vRangeEndInput);

        uRange = [uRangeStart, uRangeEnd];
        vRange = [vRangeStart, vRangeEnd];

        changed = true;
    }

    var zoomCoefficient = 600;

    document.getElementById("buttonIn").addEventListener("click", function () {
        zoomCoefficient -= 10;
    });

    document.getElementById("buttonOut").addEventListener("click", function () {
        zoomCoefficient += 10;
    });

    const canvas = document.getElementById("webgl-canvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        console.error("Unable to initialize WebGL. Your browser may not support it.");
        return;
    }

    var length_of_strip;

    // Vertex and fragment shader source code
    const vertexShaderSource = `
        attribute vec4 vPosition;
        attribute vec4 vNormal;

        varying vec4 fColor;

        uniform vec4 ambientProduct, diffuseProduct, specularProduct;
        uniform float shininess;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform vec4 lightPosition;
        uniform mat3 normalMatrix;

        void main() {
            vec3 pos = -(modelViewMatrix * vPosition).xyz;

            vec3 L;

            if (lightPosition.w == 0.0){
                L = normalize(lightPosition.xyz);
            }
            else {
                L = normalize(lightPosition.xyz - pos);
            }

            vec3 E = normalize( -pos );
            vec3 H = normalize(L + E);
            vec3 N = normalize( normalMatrix * vNormal.xyz );

            //float ambientOcclusion = max(dot(N, E), 0.2);
            vec4 ambient = ambientProduct; //* ambientOcclusion;

            float Kd = max( dot(L, N), 0.0);
            vec4 diffuse = Kd * diffuseProduct;

            float Ks = pow( max( dot(N, H), 0.0), shininess);
            //float Ks = smoothstep(0.0, 1.0, pow(max(dot(N, H), 0.0), shininess));
            vec4 specular = Ks * specularProduct;

            if ( dot( L , N ) < 0.0 ){
                specular = vec4(0.0, 0.0, 0.0, 1.0);
            }

            fColor = ambient + diffuse + specular;

            fColor.a = 1.0;

            gl_Position = projectionMatrix * modelViewMatrix * vPosition;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;

        varying vec4 fColor;

        void main() {
            
            gl_FragColor = fColor;
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

    gl.enable(gl.DEPTH_TEST);

    gl.useProgram(program);

    let normalsArray = [];

    function reverseNormal(normal) {
        return vec4(-normal[0], -normal[1], -normal[2], 0.0);
    }

    function calculateNormals(vertices) {
        var normals = [];
    
        for (var i = 0; i < vertices.length - 2; i += 3) {
            var v0 = vertices[i];
            var v1 = vertices[i + 1];
            var v2 = vertices[i + 2];
    
            var edge1 = subtract(v1, v0);
            var edge2 = subtract(v2, v0);
            var normal = normalize(cross(edge1, edge2));
    
            normals.push(normal, normal, normal);
        }
    
        var averagedNormals = [];
    
        for (var i = 0; i < vertices.length; i++) {
            var normalSum = vec3(0, 0, 0);
    
            // Sum normals from adjacent triangles
            for (var j = 0; j < normals.length; j += 3) {
                if (Math.floor(i / 3) === Math.floor(j / 3)) {
                    normalSum = add(normalSum, normals[j]);
                }
            }
    
            // Average and normalize the sum
            var averagedNormal = normalize(normalSum);
            averagedNormals.push(averagedNormal);
        }
    
        return averagedNormals;
    }
    

    function createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa) {
        // Create an empty array to store the vertices.
        const verticesBreathable1 = [];
        const verticesBreathable2 = [];

        const totalVertices = [];
        const normalVertices = [];

        const sebvertices = [];
        const sebnormals = [];
        var chose = 1;

        for (let u = uRange[0]; u <= uRange[1]; u += uPrecision) {
            for (let v = vRange[0]; v <= vRange[1]; v += vPrecision) {
                const wsqr = 1 - aa * aa;
                const w = Math.sqrt(wsqr);
                const denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));

                const x = -u + (2 * wsqr * Math.cosh(aa * u) * Math.sinh(aa * u) / denom);
                const y = 2 * w * Math.cosh(aa * u) * (-(w * Math.cos(v) * Math.cos(w * v)) - (Math.sin(v) * Math.sin(w * v))) / denom;
                const z = 2 * w * Math.cosh(aa * u) * (-(w * Math.sin(v) * Math.cos(w * v)) + (Math.cos(v) * Math.sin(w * v))) / denom;

                if (chose % 3 == 1) {
                    verticesBreathable1.push(vec4(x, y, z, 1.0));
                }
                else if (chose % 3 == 2) {
                    verticesBreathable2.push(vec4(x, y, z, 1.0));
                }
            }
            chose++;
            if (chose % 3 == 0) {
                u -= uPrecision;
                if (length_of_strip === undefined) {
                    length_of_strip = verticesBreathable1.length;
                }
                for (var i = 0; i < verticesBreathable1.length; i++) {
                    var a = verticesBreathable1.shift();
                    var b = verticesBreathable2.shift();
                    totalVertices.push(a);
                    totalVertices.push(b);
                }
                chose++;
            }
        }

        function quad(a, b, c, d) {
            var t1 = subtract(totalVertices[b], totalVertices[a]);
            var t2 = subtract(totalVertices[c], totalVertices[b]);
            var normali = cross(t1, t2);
            var normal = vec3(normali);
          
            sebvertices.push(totalVertices[a]);
            normalVertices.push(normal);
            sebvertices.push(totalVertices[b]);
            normalVertices.push(normal);
            sebvertices.push(totalVertices[c]);
            normalVertices.push(normal);
            sebvertices.push(totalVertices[a]);
            normalVertices.push(normal);
            sebvertices.push(totalVertices[c]);
            normalVertices.push(normal);
            sebvertices.push(totalVertices[d]);
            normalVertices.push(normal);
          }


        for (var i = 0; i < totalVertices.length - 3; i = i + 2) {

            //quad(i, i+1, i+2, i+3);
            sebvertices.push(totalVertices[i]);     // a
            sebvertices.push(totalVertices[i + 1]); // b
            sebvertices.push(totalVertices[i + 2]); // c - quad d
            sebvertices.push(totalVertices[i + 2]); // c - quad d
            sebvertices.push(totalVertices[i + 1]); // b
            sebvertices.push(totalVertices[i + 3]); // d - quad c



            var t1 = subtract(totalVertices[i + 1], totalVertices[i]); // b a
            var t2 = subtract(totalVertices[i + 2], totalVertices[i]); // c a
            var normal = normalize(cross(t2, t1));
            normal = vec4(normal);
            normal[3] = 0.0;

            sebnormals.push(normal);
            sebnormals.push(normal);
            sebnormals.push(normal);

            var t1 = subtract(totalVertices[i + 1], totalVertices[i + 2]); // b a
            var t2 = subtract(totalVertices[i + 3], totalVertices[i + 2]); // c a
            var normal = normalize(cross(t2, t1));
            normal = vec4(normal);
            normal[3] = 0.0;

            sebnormals.push(normal);
            sebnormals.push(normal);
            sebnormals.push(normal);
            
        }


        //length_of_strip = undefined;

        // chose = 0;

        // for (var i = 0; i < totalVertices.length - 2; i++) {
        //     var t1 = subtract(totalVertices[i + 1], totalVertices[i]);
        //     var t2 = subtract(totalVertices[i + 2], totalVertices[i]);
        //     var normal = normalize(cross(t2, t1));

        //     normal = vec4(normal);
        //     normal[3] = 0.0;

        //     if (i % (length_of_strip) == 0){
        //         chose = 0;
        //     }

        //     if (chose % 2 == 0){
        //         normal = reverseNormal(normal);
        //     }
        //     chose++;

        //     normalVertices.push(normal);
        //     normalVertices.push(normal);
        //     normalVertices.push(normal);

        //     // normalVertices.push(totalVertices[i][0], totalVertices[i][1], totalVertices[i][2], 0.0 );
        //     // normalVertices.push(totalVertices[i+1][0], totalVertices[i+1][1], totalVertices[i+1][2], 0.0 );
        //     // normalVertices.push(totalVertices[i+2][0], totalVertices[i+2][1], totalVertices[i+2][2], 0.0 );
        // }

        normalsArray = (sebnormals);



        return sebvertices;
    }

    let vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);

    // Create buffer and set vertices based on the parametrization
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const positionAttribLocation = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(positionAttribLocation, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttribLocation);

    const nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    const vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // Set up the perspective matrix
    var projectionMatrix = mat4();
    projectionMatrix = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 10000);

    // Set up the model-view matrix
    var modelViewMatrix = mat4();
    modelViewMatrix = lookAt(vec3(0, 0, -(zoomCoefficient)), vec3(0, 0, 0), vec3(0, 1, 0));

    // Set up the perspective matrix
    var modelviewmatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");

    gl.uniformMatrix4fv(modelviewmatrixLocation, false, flatten(modelViewMatrix));

    var projectionmatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

    gl.uniformMatrix4fv(projectionmatrixLocation, false, flatten(projectionMatrix));

    var normalMatrixLocation = gl.getUniformLocation(program, "normalMatrix");
    
    normalMatrix = [
        vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2]),
        vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2]),
        vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2])
    ];

    gl.uniformMatrix3fv(normalMatrixLocation, false, flatten(normalMatrix));

    var lightPosition = vec4(0.0, 0.0, -60.0, 0.0 );
    var lightAmbient = vec4(0.1, 0.1, 0.1, 1.0 );
    var lightDiffuse = vec4( 0.5, 0.5, 0.5, 1.0 );
    var lightSpecular = vec4( 0.3, 0.3, 0.3, 1.0 );
    
    var materialAmbient = vec4( 0.0, 0.0, 1.0, 1.0 );
    var materialDiffuse = vec4( 0.0, 0.0, 1.0, 1.0 );
    var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
    var materialShininess = 4.0;

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    var lightPositionLoc = gl.getUniformLocation(program, "lightPosition");
    var ambientColorLoc = gl.getUniformLocation(program, "ambientProduct");
    var diffuseColorLoc = gl.getUniformLocation(program, "diffuseProduct");
    var specularColorLoc = gl.getUniformLocation(program, "specularProduct");
    var shininessLoc = gl.getUniformLocation(program, "shininess");

    gl.uniform4fv(lightPositionLoc, flatten(lightPosition));
    gl.uniform4fv(ambientColorLoc, flatten(ambientProduct));
    gl.uniform4fv(diffuseColorLoc, flatten(diffuseProduct));
    gl.uniform4fv(specularColorLoc, flatten(specularProduct));
    gl.uniform1f(shininessLoc, materialShininess);

    render();

    function render() {
        // Set the WebGL rendering context clear color
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // console.log(`uRange: ${uRange} vRange: ${vRange}, uPrecision: ${uPrecision} vPrecision: ${vPrecision} aa: ${aa}`);

        if (changed) {
            vertices = createBreatherSurfaceVertices(uRange, vRange, uPrecision, vPrecision, aa);
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
        }

        // modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationX * (Math.PI / 180), [1, 0, 0]));

        modelViewMatrix[2][3] = -(zoomCoefficient);
        modelViewMatrix = mult(modelViewMatrix, rotate(totalRotationY * (Math.PI / 180), [0, 1, 0]));

        //var modelviewmatrixLocation = gl.getUniformLocation(program, "modelViewMatrix");

        gl.uniformMatrix4fv(modelviewmatrixLocation, false, flatten(modelViewMatrix));

        // var projectionmatrixLocation = gl.getUniformLocation(program, "projectionMatrix");

        // gl.uniformMatrix4fv(projectionmatrixLocation, false, flatten(projectionMatrix));

        changed = false;
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length);
        requestAnimationFrame(render)
    }
});