document.addEventListener('DOMContentLoaded', () => {
    const projects = [
        { id: 'triangle', title: 'Triangle', description: 'A simple WebGPU example drawing a colorful triangle using vertex buffers.', url: 'src/helloTriangle' },
        { id: '3dgs', title: '3DGS', description: 'Realtime rendering 3dgs scene.', url: 'src/3dgs' },
    ];

    const projectListEl = document.getElementById('project-list');
    const projectTitleEl = document.getElementById('project-title');
    const projectDescriptionEl = document.getElementById('project-description');
    const demoFrameEl = document.getElementById('demo-frame');

    projectListEl.innerHTML = projects.map(p => 
        `<label class="label">
            <input value="${p.id}" name="project-radio" class="radio-input" type="radio" data-id="${p.id}">
            <div class="radio-design"></div>
            <div class="label-text">${p.title}</div>
        </label>`
    ).join('');

    projectListEl.addEventListener('change', e => {
        if (e.target.classList.contains('radio-input')) {
            const id = e.target.dataset.id;
            window.location.hash = id;
            loadProject(id);
        }
    });

    function selectRadio(projectId) {
        const radio = projectListEl.querySelector(`.radio-input[data-id="${projectId}"]`);
        if (radio) radio.checked = true;
    }

    function loadProject(projectId) {
        const p = projects.find(x => x.id === projectId);
        if (!p) return;

        projectTitleEl.textContent = p.title;
        projectDescriptionEl.textContent = p.description;
        // loading animation
        document.getElementById("loading").style.display = "block";

        demoFrameEl.src = `${p.url}/index.html`;
        demoFrameEl.onload = () => {
            document.getElementById("loading").style.display = "none";
        };
        selectRadio(projectId);
    }

});
