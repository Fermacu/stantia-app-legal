(function () {
  var gallery = document.querySelector(".project-gallery");
  var items = Array.prototype.slice.call(document.querySelectorAll(".project-gallery__item"));
  var box = document.querySelector(".project-lightbox");
  if (!items.length || !box) return;

  var frame = box.querySelector("img");
  var count = box.querySelector(".project-lightbox__count");
  var download = box.querySelector(".project-lightbox__download");
  var index = 0;

  function masterSrc(item) {
    var full = item.getAttribute("data-full");
    if (full) return full;
    var web = item.getAttribute("data-src") || "";
    return web.replace(/\/([^/]+)\.jpe?g$/i, function (_, name) {
      if (/^IMG_/i.test(name)) return "/" + name + ".JPG";
      return "/IMG_" + name + ".JPG";
    });
  }

  function fileName(item, src) {
    var label = (item.getAttribute("data-alt") || "stantia")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");
    var leaf = (src.split("/").pop() || "photo.JPG").replace(/^IMG_/i, "");
    return (label ? label + "-" : "") + leaf;
  }

  function saveFile(url, name) {
    fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("download");
        return response.blob();
      })
      .then(function (blob) {
        var objectUrl = URL.createObjectURL(blob);
        var link = document.createElement("a");
        link.href = objectUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(function () {
          URL.revokeObjectURL(objectUrl);
        }, 1500);
      })
      .catch(function () {
        var link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      });
  }

  function openGallery() {
    if (!gallery) return;
    gallery.hidden = false;
    gallery.scrollTop = 0;
    document.body.classList.add("gallery-open");
  }

  function closeGallery() {
    if (!gallery) return;
    gallery.hidden = true;
    document.body.classList.remove("gallery-open");
  }

  function show(next) {
    index = (next + items.length) % items.length;
    var item = items[index];
    var src = masterSrc(item);
    frame.src = src;
    frame.alt = item.getAttribute("data-alt") || "";
    if (count) count.textContent = index + 1 + " / " + items.length;
    if (download) {
      download.dataset.href = src;
      download.dataset.name = fileName(item, src);
    }
    box.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function closePhoto() {
    box.hidden = true;
    document.body.classList.remove("lightbox-open");
    frame.removeAttribute("src");
  }

  var opener = document.querySelector(".project-banner__gallery");
  var galleryClose = gallery && gallery.querySelector(".project-gallery__close");
  if (opener && gallery && gallery.hidden && opener.tagName !== "A") {
    opener.addEventListener("click", openGallery);
  }
  if (galleryClose) {
    galleryClose.addEventListener("click", function () {
      closePhoto();
      closeGallery();
    });
  }

  items.forEach(function (item, itemIndex) {
    item.addEventListener("click", function () {
      show(itemIndex);
    });
  });

  box.querySelector(".project-lightbox__close").addEventListener("click", closePhoto);
  box.querySelector(".project-lightbox__nav--prev").addEventListener("click", function () {
    show(index - 1);
  });
  box.querySelector(".project-lightbox__nav--next").addEventListener("click", function () {
    show(index + 1);
  });
  if (download) {
    download.addEventListener("click", function () {
      if (!download.dataset.href) return;
      saveFile(download.dataset.href, download.dataset.name || "photo.JPG");
    });
  }
  box.addEventListener("click", function (event) {
    if (event.target === box) closePhoto();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") {
      if (box.hidden) return;
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "ArrowLeft") show(index - 1);
      return;
    }
    if (!box.hidden) closePhoto();
    else if (gallery && !gallery.hidden && document.body.classList.contains("gallery-open")) closeGallery();
  });
})();
