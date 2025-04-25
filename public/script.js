document.addEventListener("DOMContentLoaded", async function () {
    const uploadButton = document.getElementById("uploadButton");
    const uploadedImage = document.getElementById("uploadedImage");
    const pointsContainer = document.getElementById("pointsContainer");
    const confirmROIButton = document.getElementById("confirmROI");
    const classIdInput = document.getElementById("classIdInput");
    const reverseCheckbox = document.getElementById("reverseCheckbox");
    const addNewTypeButton = document.getElementById("addNewType");
    const downloadJsonButton = document.getElementById("downloadJson");

    let points = [];
    let typeCounter = 0;
    let selectedTypeId = 0;
    let storedData = [{ TypeId: typeCounter, Regions: [] }];
    let imageOffsetX = 0, imageOffsetY = 0;
    let imageScaleX = 1, imageScaleY = 1;
    let dragState = {
        dragging: false,
        pointIndex: null,
        typeId: null,
        roiIndex: null
    };


    try {
        const response = await fetch("/load-project");
        const result = await response.json();

        if (result.success) {
            storedData = result.roiData;

            const imageBlob = await fetch(result.imageData).then(r => r.blob());
            displayImage(imageBlob);

            setTimeout(() => {
                reloadAllTypes();
            }, 300);
        } else {
            console.log("ZIP file not found, continuing with an empty state.");
        }
    } catch (err) {
        console.error("ZIP loading error:", err);
    }

    uploadButton.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.click();

        input.addEventListener("change", () => {
            if (input.files.length > 0) {
                displayImage(input.files[0]);
            }
        });
    });

    function displayImage(blob) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const image = new Image();
            image.onload = function () {
                const containerWidth = pointsContainer.clientWidth;
                const containerHeight = pointsContainer.clientHeight;
                const aspectRatio = image.naturalWidth / image.naturalHeight;

                let drawWidth = containerWidth;
                let drawHeight = containerWidth / aspectRatio;

                if (drawHeight > containerHeight) {
                    drawHeight = containerHeight;
                    drawWidth = drawHeight * aspectRatio;
                }

                imageOffsetX = (containerWidth - drawWidth) / 2;
                imageOffsetY = (containerHeight - drawHeight) / 2;
                imageScaleX = drawWidth / image.naturalWidth;
                imageScaleY = drawHeight / image.naturalHeight;

                uploadedImage.src = event.target.result;
                uploadedImage.style.display = "block";
                uploadedImage.style.position = "absolute";
                uploadedImage.style.width = `${drawWidth}px`;
                uploadedImage.style.height = `${drawHeight}px`;
                uploadedImage.style.left = `${imageOffsetX}px`;
                uploadedImage.style.top = `${imageOffsetY}px`;

                reloadAllTypes();
            };

            image.src = event.target.result;

            showROIPolygonsForType(selectedTypeId);
        };
        reader.readAsDataURL(blob);
    }

    function reloadAllTypes() {
        const rightPanel = document.querySelector(".right-panel");
        rightPanel.querySelectorAll(".type-container").forEach(el => el.remove());

        storedData.forEach((type) => {
            selectedTypeId = type.TypeId;
            typeCounter = Math.max(typeCounter, type.TypeId + 1);

            type.Regions.forEach((roi, index) => {
                updateROIInfo(roi, type.TypeId, index);
            });
        });

        showROIPolygonsForType(selectedTypeId);
    }

    uploadedImage.addEventListener("click", function (event) {
        if (!uploadedImage.src) return;

        const rect = uploadedImage.getBoundingClientRect();
        const x = (event.clientX - rect.left) / imageScaleX;
        const y = (event.clientY - rect.top) / imageScaleY;

        addPoint(x, y);
    });

    function addPoint(x, y) {
        const point = document.createElement("div");
        point.classList.add("point");

        point.style.left = `${x * imageScaleX + imageOffsetX}px`;
        point.style.top = `${y * imageScaleY + imageOffsetY}px`;

        pointsContainer.appendChild(point);
        points.push({ x: Math.round(x), y: Math.round(y) });

        if (points.length > 1) {
            drawLine(points[points.length - 2], points[points.length - 1]);
        }
    }

    function drawLine(point1, point2) {
        const line = document.createElement("div");
        line.classList.add("line");

        const length = Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
        const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x) * (180 / Math.PI);

        line.style.width = `${length * imageScaleX}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.left = `${point1.x * imageScaleX + imageOffsetX}px`;
        line.style.top = `${point1.y * imageScaleY + imageOffsetY}px`;

        pointsContainer.appendChild(line);
    }

    confirmROIButton.addEventListener("click", function () {
        if (points.length < 3) {
            alert("You must add at least 3 points to create an ROI!");
            return;
        }

        drawLine(points[points.length - 1], points[0]);

        const reverseValue = validateReverseSelection();
        if (reverseValue === null) return;

        const classIdValues = classIdInput.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));

        if (classIdValues.length === 0) {
            alert("Please enter a valid ClassId!");
            return;
        }

        const newROI = {
            ClassId: classIdValues,
            PolyPointList: points.map(p => ({ X: Math.round(p.x), Y: Math.round(p.y) })),
            Reverse: reverseValue
        };

        let currentType = storedData.find(t => t.TypeId === selectedTypeId);
        if (!currentType) {
            currentType = { TypeId: typeCounter, Regions: [] };
            storedData.push(currentType);
        }

        currentType.Regions.push(newROI);

        let roiIndex = storedData.find(t => t.TypeId === selectedTypeId).Regions.length - 1;
        updateROIInfo(newROI, selectedTypeId, roiIndex);

        points = [];
        classIdInput.value = "";
        reverseCheckbox.checked = false;

    });

    function validateReverseSelection() {
        return reverseCheckbox.checked;
    }

    addNewTypeButton.addEventListener("click", function () {
        const usedTypeIds = storedData.map(t => t.TypeId);

        document.querySelectorAll(".type-container").forEach(container => {
            const idMatch = container.id.match(/type-(\d+)/);
            if (idMatch) {
                const id = parseInt(idMatch[1]);
                if (!usedTypeIds.includes(id)) {
                    usedTypeIds.push(id);
                }
            }
        });

        let newTypeId = 0;
        while (usedTypeIds.includes(newTypeId)) {
            newTypeId++;
        }

        selectedTypeId = newTypeId;

        const newType = { TypeId: selectedTypeId, Regions: [] };
        storedData.push(newType);


        document.querySelectorAll(".accordion-content").forEach(content => {
            content.style.display = "none";
        });

        points = [];
        pointsContainer.innerHTML = "";

        const rightPanel = document.querySelector(".right-panel");
        const typeContainer = document.createElement("div");
        typeContainer.id = `type-${selectedTypeId}`;
        typeContainer.classList.add("type-container");

        const header = document.createElement("div");
        header.classList.add("accordion-header");

        const title = document.createElement("span");
        title.textContent = `Type ${selectedTypeId}`;
        title.style.flex = "1";

        const closeBtn = document.createElement("button");
        closeBtn.classList.add("delete-type-btn");
        closeBtn.innerHTML = "✖";
        closeBtn.title = "Delete This Type";

        closeBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            const confirmDelete = confirm(`Type ${selectedTypeId} delete completely?`);
            if (!confirmDelete) return;

            storedData = storedData.filter(t => t.TypeId !== selectedTypeId);
            typeContainer.remove();

            if (selectedTypeId === selectedTypeId) {
                selectedTypeId = 0;
                pointsContainer.innerHTML = "";
            }
        });

        header.appendChild(title);
        header.appendChild(closeBtn);

        header.addEventListener("click", (function (currentTypeId) {
            return function () {
                selectedTypeId = currentTypeId;

                const content = typeContainer.querySelector(".accordion-content");
                if (content.style.display === "none") {
                    content.style.display = "block";
                    showROIPolygonsForType(currentTypeId);
                } else {
                    content.style.display = "none";
                    pointsContainer.innerHTML = "";
                }
            };
        })(selectedTypeId));

        const content = document.createElement("div");
        content.classList.add("accordion-content");
        content.style.display = "block";

        typeContainer.appendChild(header);
        typeContainer.appendChild(content);
        rightPanel.appendChild(typeContainer);

        typeContainer.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function updateROIInfo(roi, typeId, roiIndex) {
        const rightPanel = document.querySelector(".right-panel");
        let typeContainer = rightPanel.querySelector(`#type-${typeId}`);

        if (!typeContainer) {
            typeContainer = document.createElement("div");
            typeContainer.id = `type-${typeId}`;
            typeContainer.classList.add("type-container");

            const header = document.createElement("div");
            header.classList.add("accordion-header");

            const title = document.createElement("span");
            title.textContent = `Type ${typeId}`;
            title.style.flex = "1";

            const closeBtn = document.createElement("button");
            closeBtn.classList.add("delete-type-btn");
            closeBtn.innerHTML = "✖";
            closeBtn.title = "Bu Type'ı Sil";
            closeBtn.addEventListener("click", function (e) {
                e.stopPropagation();

                const confirmDelete = confirm(`Type ${typeId} deleted completely?`);
                if (!confirmDelete) return;

                storedData = storedData.filter(t => t.TypeId !== typeId);

                typeContainer.remove();

                if (selectedTypeId === typeId) {
                    selectedTypeId = 0;
                    pointsContainer.innerHTML = "";
                }
            });

            header.appendChild(title);
            header.appendChild(closeBtn);

            header.addEventListener("click", (function (currentTypeId) {
                return function () {
                    selectedTypeId = currentTypeId;

                    const content = typeContainer.querySelector(".accordion-content");
                    if (content.style.display === "none") {
                        content.style.display = "block";
                        showROIPolygonsForType(currentTypeId);
                    } else {
                        content.style.display = "none";
                        pointsContainer.innerHTML = "";
                    }
                };
            })(typeId));

            const content = document.createElement("div");
            content.classList.add("accordion-content");
            content.style.display = "none";

            typeContainer.appendChild(header);
            typeContainer.appendChild(content);
            rightPanel.appendChild(typeContainer);
        }

        const content = typeContainer.querySelector(".accordion-content");
        content.style.display = "block";
        showROIPolygonsForType(typeId);

        const infoBox = document.createElement("div");
        infoBox.classList.add("info-box");

        infoBox.innerHTML = `
        <div class="roi-info-row">
            <div class="info-item">
                <label>ClassId:</label>
                <input type="text" class="classIdInput" value="${roi.ClassId.join(", ")}" disabled>
            </div>
            <div class="info-item reverse-box">
                <label>Reverse:</label>
                <input type="checkbox" class="reverseCheckbox" ${roi.Reverse ? "checked" : ""} disabled>
            </div>
            <div class="info-item">
                <label>Koordinatlar:</label>
                <div class="coordinates-list">
                    ${roi.PolyPointList.map(p => `<div>X: ${p.X}, Y: ${p.Y}</div>`).join(" ")}
                </div>
            </div>
        </div>
        <div class="roi-button-group">
            <button class="editButton">Düzenle</button>
            <button class="saveButton" disabled>Kaydet</button>
            <button class="deleteButton">Sil</button>
        </div>
    `;

        content.appendChild(infoBox);

        const classIdInput = infoBox.querySelector(".classIdInput");
        const reverseCheckbox = infoBox.querySelector(".reverseCheckbox");
        const editButton = infoBox.querySelector(".editButton");
        const saveButton = infoBox.querySelector(".saveButton");
        const deleteButton = infoBox.querySelector(".deleteButton");

        editButton.addEventListener("click", function () {
            classIdInput.disabled = false;
            reverseCheckbox.disabled = false;
            saveButton.disabled = false;
            showDraggablePoints(roi, typeId, roiIndex);
        });

        saveButton.addEventListener("click", function () {
            const newClassIdValues = classIdInput.value.split(',')
                .map(v => parseInt(v.trim()))
                .filter(v => !isNaN(v));
            const newReverseValue = reverseCheckbox.checked;

            if (newClassIdValues.length === 0) {
                alert("Please enter a valid ClassId!");
                return;
            }

            storedData.forEach(type => {
                if (type.TypeId === typeId) {
                    type.Regions[roiIndex].ClassId = newClassIdValues;
                    type.Regions[roiIndex].Reverse = newReverseValue;
                }
            });

            classIdInput.disabled = true;
            reverseCheckbox.disabled = true;
            saveButton.disabled = true;

            alert("Changes have been saved!");
        });

        deleteButton.addEventListener("click", function () {
            const confirmDelete = confirm("Are you sure you want to delete this ROI?");
            if (!confirmDelete) return;

            storedData.forEach((type, typeIndex) => {
                if (type.TypeId === typeId) {
                    type.Regions.splice(roiIndex, 1);

                    if (type.Regions.length === 0) {
                        storedData.splice(typeIndex, 1);
                        document.querySelector(`#type-${typeId}`)?.remove();
                    }
                }
            });

            pointsContainer.innerHTML = "";

            infoBox.remove();
            alert("ROI has been successfully deleted!");
        });

    }

    function showDraggablePoints(roi, typeId, roiIndex) {
        const polyPoints = roi.PolyPointList;

        pointsContainer.innerHTML = "";

        for (let i = 0; i < polyPoints.length; i++) {
            const point = polyPoints[i];

            const pointEl = document.createElement("div");
            pointEl.classList.add("point");
            pointEl.style.left = `${point.X * imageScaleX + imageOffsetX}px`;
            pointEl.style.top = `${point.Y * imageScaleY + imageOffsetY}px`;

            pointEl.addEventListener("mousedown", (e) => {
                dragState.dragging = true;
                dragState.pointIndex = i;
                dragState.typeId = typeId;
                dragState.roiIndex = roiIndex;
            });

            pointsContainer.appendChild(pointEl);

            const nextPoint = polyPoints[(i + 1) % polyPoints.length];
            drawLine({ x: point.X, y: point.Y }, { x: nextPoint.X, y: nextPoint.Y });
        }
    }

    document.addEventListener("mousemove", function (e) {
        if (!dragState.dragging) return;

        const rect = uploadedImage.getBoundingClientRect();
        const x = (e.clientX - rect.left) / imageScaleX;
        const y = (e.clientY - rect.top) / imageScaleY;

        const clampedX = Math.max(0, Math.min(x, uploadedImage.naturalWidth));
        const clampedY = Math.max(0, Math.min(y, uploadedImage.naturalHeight));


        const roi = storedData.find(t => t.TypeId === dragState.typeId)?.Regions[dragState.roiIndex];
        if (!roi) return;

        roi.PolyPointList[dragState.pointIndex] = { X: Math.round(clampedX), Y: Math.round(clampedY) };

        showDraggablePoints(roi, dragState.typeId, dragState.roiIndex);

        updateCoordinateListInSidebar(roi, dragState.typeId, dragState.roiIndex);
    });

    function updateCoordinateListInSidebar(roi, typeId, roiIndex) {
        const typeContainer = document.querySelector(`#type-${typeId}`);
        if (!typeContainer) return;

        const infoBoxes = typeContainer.querySelectorAll(".info-box");
        const infoBox = infoBoxes[roiIndex];
        if (!infoBox) return;

        const coordsList = infoBox.querySelector(".coordinates-list");
        coordsList.innerHTML = roi.PolyPointList.map(p => `<div>X: ${p.X}, Y: ${p.Y}</div>`).join(" ");
    }


    document.addEventListener("mouseup", function () {
        dragState.dragging = false;
    });



    function showROIPolygonsForType(typeId) {
        pointsContainer.innerHTML = "";

        const typeData = storedData.find(t => t.TypeId === typeId);
        if (!typeData) return;

        typeData.Regions.forEach(region => {
            const polyPoints = region.PolyPointList;
            for (let i = 0; i < polyPoints.length; i++) {
                const point = polyPoints[i];

                const pointEl = document.createElement("div");
                pointEl.classList.add("point");
                pointEl.style.left = `${point.X * imageScaleX + imageOffsetX}px`;
                pointEl.style.top = `${point.Y * imageScaleY + imageOffsetY}px`;
                pointsContainer.appendChild(pointEl);

                const nextPoint = polyPoints[(i + 1) % polyPoints.length];
                drawLine({ x: point.X, y: point.Y }, { x: nextPoint.X, y: nextPoint.Y });
            }
        });
    }

    downloadJsonButton.addEventListener("click", function () {
        const blob = new Blob([JSON.stringify(storedData, null, 4)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "roi_data.json";
        a.click();
    });


});
