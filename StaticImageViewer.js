class StaticImageViewer
{
    static #zoom;
    static #zoomMode = "fitWindow";
    static #maxZoom = 10;
    static #mouseCatchInfo = null;


    static get zoom()
    {
        return this.#zoom;
    }

    static set zoom(value)
    {
        this.#zoom = value;
        this.#zoomMode = "manual";
        this.#correctZoom();
        this.updateZoom();
    }

    static get maxZoom()
    {
        return this.#maxZoom;
    }

    static set maxZoom(value)
    {
        this.#maxZoom = value;
        this.#correctZoom();
        this.updateZoom();
    }


    static enable()
    {
        image.addEventListener("load", () => {
            this.fitWindow();
            window.addEventListener("resize", () => { if (this.#zoomMode == "fitWindow") this.fitWindow(); });
            document.addEventListener("keydown", e => this.#handleKeyDown(e));
            imageViewer.addEventListener("wheel", e => this.#handleWheel(e));
            image.addEventListener("mousedown", e => this.#handleMouseDown(e));
            image.addEventListener("mousemove", e => this.#handleMouseMove(e));
            image.onmouseup = image.onmouseleave = () => { this.#mouseCatchInfo = null; this.#updateCursor(); };
        });
    }

    /** Устанавливает масштаб изображения по высоте и ширине контейнера. */
    static fitWindow()
    {
        this.#zoomMode = "fitWindow";
        this.#zoom = Math.min(imageViewer.offsetWidth / image.naturalWidth, imageViewer.offsetHeight / image.naturalHeight);
        this.updateZoom();
    }

    /**
     * Изменяет масштаб изображения с сохранением центральной точки.
     * @param {number} newValue Новое значение масштаба.
     */
    static changeZoom(newValue)
    {
        const centerPoint = this.#saveCenterPoint();
        this.#zoomMode = "manual";
        this.#zoom = newValue;
        this.#correctZoom()
        this.updateZoom();
        this.#restoreCenterPoint(centerPoint);
    }

    /** Обновляет размер изображения в соответствии с текущим значением масштаба. */
    static updateZoom()
    {
        image.style.width = image.naturalWidth * this.#zoom + "px";
        image.style.height = image.naturalHeight * this.#zoom + "px";
           imageViewer.classList.toggle("centerHor", image.width < imageViewer.offsetWidth);
           imageViewer.classList.toggle("centerVert", image.height < imageViewer.offsetHeight);
        this.#updateCursor();
    }

    /** Корректирует масштаб изображения так, чтобы его размер находился в диапазоне от 100 пикселей до maxZoom. */
    static #correctZoom()
    {
        if (this.#zoom > this.#maxZoom)
            this.#zoom = this.#maxZoom;
        else if (this.#zoom < 1 && (image.naturalWidth * this.#zoom < 100 || image.naturalHeight * this.#zoom < 100))
            this.#zoom = Math.min(1, 100 / Math.min(image.naturalWidth, image.naturalHeight));
    }

    /** Сохраняет в объект координату точки изображения, которая в данный момент отображается по центру. */
    static #saveCenterPoint()
    {
        let centerX = image.naturalWidth * this.#zoom > imageViewer.offsetWidth
            ? (imageViewer.scrollLeft + imageViewer.clientWidth / 2) / this.#zoom
            : image.naturalWidth / 2;
        let centerY = image.naturalHeight * this.#zoom > imageViewer.offsetHeight
            ? (imageViewer.scrollTop + imageViewer.clientHeight / 2) / this.#zoom
            : image.naturalHeight / 2;
        //debugger;
        return { x : centerX, y : centerY };
    }

    /** Устанавливает состояние прокрутки таким образом, чтобы указанная точка изображения находилась в центре видимой области. */
    static #restoreCenterPoint(point)
    {
        if (image.width > imageViewer.offsetWidth)
            imageViewer.scrollLeft = point.x * this.#zoom - imageViewer.clientWidth / 2;
        if (image.height > imageViewer.offsetHeight)
            imageViewer.scrollTop = point.y * this.#zoom - imageViewer.clientHeight / 2;
    }

    /** Обновляет курсор в зависимости от возможности и активности прокрутки изображения (стрелка, рука или зажатая рука).  */
    static #updateCursor()
    {
        image.style.cursor = image.width <= imageViewer.offsetWidth && image.height <= imageViewer.offsetHeight
            ? "default"
            : this.#mouseCatchInfo ? "grabbing" : "grab";
    }


    static #handleKeyDown(e)
    {
        //console.dir(e);
        if (e.altKey || e.ctrlKey || e.shiftKey)
            return;
        switch (e.code)
        {
            case 'NumpadAdd':
                this.changeZoom(this.#zoom * 1.1);
                break;
            case 'NumpadSubtract':
                this.changeZoom(this.#zoom / 1.1);
                break;
            case 'NumpadDivide':
                this.changeZoom(1);
                break;
            case 'NumpadMultiply':
                this.fitWindow();
                break;
        }
    }

    static #handleWheel(e)
    {
        this.changeZoom(e.deltaY >= 0 ? this.#zoom / 1.2 : this.#zoom * 1.2);
        e.preventDefault();
    }

    static #handleMouseDown(e)
    {
        this.#mouseCatchInfo = { mouseX : e.screenX, mouseY : e.screenY, scrollX : imageViewer.scrollLeft , scrollY : imageViewer.scrollTop};
        //console.log(viewer.scrollLeft);
        this.#updateCursor();
        e.preventDefault();
    }

    static #handleMouseMove(e)
    {
        if (this.#mouseCatchInfo == null) return;
        //console.log(e);
        const dx = e.screenX - this.#mouseCatchInfo.mouseX;
        const dy = e.screenY - this.#mouseCatchInfo.mouseY;
        imageViewer.scrollLeft = this.#mouseCatchInfo.scrollX - dx;
        imageViewer.scrollTop = this.#mouseCatchInfo.scrollY - dy;
        //console.log(dx + ':' + dy);
        return false;
    }
}