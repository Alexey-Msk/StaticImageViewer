/**
 * Элемент управления для просмотра изображения на странице.
 * Поддерживает масштабирование и прокрутку с помощью клавиатуры (Numpad: + - / *) и мыши.
 * @version 2024-06-14
 */
class StaticImageViewer
{
    static #imageViewer;
    static #image;

    static #zoom;
    static #zoomMode = "fitSize";
    static #maxZoom = 10;
    static #mouseCatchInfo = null;
    static #scrollbarWidth;

    /** Коэффициент изменения масштаба с помощью клавиатуры или мыши. Определяет скорость масштабирования. */
    static zoomModifier = 1.1;


    static get zoom()
    {
        return this.#zoom;
    }

    /**
     * Значение масштаба.
     * @param {number} value
     */
    static set zoom(value)
    {
        const centerPoint = this.#saveCenterPoint();
        this.#zoomMode = "manual";
        this.#zoom = value;
        this.#correctZoom();
        this.updateZoom();
        this.#restoreCenterPoint(centerPoint);
    }

    static get maxZoom()
    {
        return this.#maxZoom;
    }

    /**
     * Максимальное значение масштаба.
     * @param {number} value
     */
    static set maxZoom(value)
    {
        this.#maxZoom = value;
        this.#correctZoom();
        this.updateZoom();
    }

    static get zoomMode()
    {
        return this.#zoomMode;
    }

    /**
     * Режим масштабирования.
     * @param {string} value
     */
    static set zoomMode(value)
    {
        if (!["manual", "fitSize", "fitWidth", "fitHeight"].includes(value))
            throw new RangeError("Неверно указан режим масштабирования.");
        this.#zoomMode = value;
        if (this.#zoomMode != "manual")
            this.#fitByCurrentMode();
    }


    /**
     * Инициализирует управление изображением.
     * @param {HTMLElement} this.#imageViewer Используемый элемент контейнера, который должен содержать элемент `<img>`.
     */
    static enable(imageViewer)
    {
        this.#imageViewer = imageViewer;
        const image = this.#image = imageViewer.querySelector("img");
        if (!image)
            throw new Error("Указанный контейнер не содержит дочерний тег <img>.");
        this.#scrollbarWidth = this.getScrollbarWidth();
        image.addEventListener("load", () => {
            this.fitSize();
            window.addEventListener("resize", () => this.#fitByCurrentMode());
            document.addEventListener("keydown", e => this.#handleKeyDown(e));
            imageViewer.addEventListener("wheel", e => this.#handleWheel(e));
            image.addEventListener("mousedown", e => this.#handleMouseDown(e));
            image.addEventListener("mousemove", e => this.#handleMouseMove(e));
            image.onmouseup = image.onmouseleave = () => { this.#mouseCatchInfo = null; this.#updateCursor(); };
        }, { once: true });
    }

    /** Устанавливает масштаб изображения по высоте и ширине контейнера. */
    static fitSize()
    {
        this.#zoom = Math.min(this.#imageViewer.offsetWidth / this.#image.naturalWidth, this.#imageViewer.offsetHeight / this.#image.naturalHeight);
        this.updateZoom();
    }

    /** Устанавливает масштаб изображения по ширине контейнера. */
    static fitWidth()
    {
        this.#zoom = this.#imageViewer.offsetWidth / this.#image.naturalWidth;
        if (this.#image.naturalHeight * this.#zoom > this.#imageViewer.offsetHeight) {
            this.#zoom -= this.#scrollbarWidth / this.#image.naturalWidth;
            if (this.#image.naturalHeight * this.#zoom < this.#imageViewer.offsetHeight)
                this.#zoom = this.#imageViewer.offsetHeight / this.#image.naturalHeight;
        }
        this.updateZoom();
    }

    /** Устанавливает масштаб изображения по высоте контейнера. */
    static fitHeight()
    {
        this.#zoom = this.#imageViewer.offsetHeight / this.#image.naturalHeight;
        if (this.#image.naturalWidth * this.#zoom > this.#imageViewer.offsetWidth) {
            this.#zoom -= this.#scrollbarWidth / this.#image.naturalHeight;
            if (this.#image.naturalWidth * this.#zoom < this.#imageViewer.offsetWidth)
                this.#zoom = this.#imageViewer.offsetWidth / this.#image.naturalWidth;
        }
        this.updateZoom();
    }

    /** Вызывает метод установки масштаба по размеру контейнера, соответствующий текущему режиму масштабирования. */
    static #fitByCurrentMode()
    {
        switch (this.#zoomMode) {
            case "fitSize":   this.fitSize();   break;
            case "fitWidth":  this.fitWidth();  break;
            case "fitHeight": this.fitHeight(); break;
        }
    }

    /** Возвращает толщину полос прокрутки. */
    static getScrollbarWidth()
    {
        // Creating invisible container
        const outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.overflow = 'scroll'; // forcing scrollbar to appear
        outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps
        document.body.appendChild(outer);
        // Creating inner element and placing it in the container
        const inner = document.createElement('div');
        outer.appendChild(inner);
        // Calculating difference between container's full width and the child width
        const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth);
        // Removing temporary elements from the DOM
        outer.parentNode.removeChild(outer);
        return scrollbarWidth;
    }

    /** Обновляет размер изображения в соответствии с текущим значением масштаба. */
    static updateZoom()
    {
        this.#image.style.width = this.#image.naturalWidth * this.#zoom + "px";
        this.#image.style.height = this.#image.naturalHeight * this.#zoom + "px";
           this.#imageViewer.classList.toggle("centerHor", this.#image.width < this.#imageViewer.offsetWidth);
           this.#imageViewer.classList.toggle("centerVert", this.#image.height < this.#imageViewer.offsetHeight);
        this.#updateCursor();
    }

    /** Корректирует масштаб изображения так, чтобы его размер находился в диапазоне от 100 пикселей до maxZoom. */
    static #correctZoom()
    {
        if (this.#zoom > this.#maxZoom)
            this.#zoom = this.#maxZoom;
        else if (this.#zoom < 1 && (this.#image.naturalWidth * this.#zoom < 100 || this.#image.naturalHeight * this.#zoom < 100))
            this.#zoom = Math.min(1, 100 / Math.min(this.#image.naturalWidth, this.#image.naturalHeight));
    }

    /** Сохраняет в объект координату точки изображения, которая в данный момент отображается по центру. */
    static #saveCenterPoint()
    {
        let centerX = this.#image.naturalWidth * this.#zoom > this.#imageViewer.offsetWidth
            ? (this.#imageViewer.scrollLeft + this.#imageViewer.clientWidth / 2) / this.#zoom
            : this.#image.naturalWidth / 2;
        let centerY = this.#image.naturalHeight * this.#zoom > this.#imageViewer.offsetHeight
            ? (this.#imageViewer.scrollTop + this.#imageViewer.clientHeight / 2) / this.#zoom
            : this.#image.naturalHeight / 2;
        //debugger;
        return { x : centerX, y : centerY };
    }

    /** Устанавливает состояние прокрутки таким образом, чтобы указанная точка изображения находилась в центре видимой области. */
    static #restoreCenterPoint(point)
    {
        if (this.#image.width > this.#imageViewer.offsetWidth)
            this.#imageViewer.scrollLeft = point.x * this.#zoom - this.#imageViewer.clientWidth / 2;
        if (this.#image.height > this.#imageViewer.offsetHeight)
            this.#imageViewer.scrollTop = point.y * this.#zoom - this.#imageViewer.clientHeight / 2;
    }

    /** Обновляет курсор в зависимости от возможности и активности прокрутки изображения (стрелка, рука или зажатая рука).  */
    static #updateCursor()
    {
        this.#image.style.cursor = this.#image.width <= this.#imageViewer.offsetWidth && this.#image.height <= this.#imageViewer.offsetHeight
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
                this.zoom *= this.zoomModifier;
                break;
            case 'NumpadSubtract':
                this.zoom /=  this.zoomModifier;
                break;
            case 'NumpadDivide':
                this.zoom = 1;
                break;
            case 'NumpadMultiply':
                this.zoomMode = "fitSize";
                break;
        }
    }

    static #handleWheel(e)
    {
        this.zoom = e.deltaY >= 0 ? this.#zoom / this.zoomModifier : this.#zoom * this.zoomModifier;
        e.preventDefault();
    }

    static #handleMouseDown(e)
    {
        this.#mouseCatchInfo = { mouseX : e.screenX, mouseY : e.screenY, scrollX : this.#imageViewer.scrollLeft , scrollY : this.#imageViewer.scrollTop};
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
        this.#imageViewer.scrollLeft = this.#mouseCatchInfo.scrollX - dx;
        this.#imageViewer.scrollTop = this.#mouseCatchInfo.scrollY - dy;
        //console.log(dx + ':' + dy);
        return false;
    }
}
