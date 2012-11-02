/**
 * Pan/Zoom - it's just a quick hack, so don't expect too much
 * @author Andrew Hedges, andrew@hedges.name
 * @created 2009-12-27 12:27:09
 * @updated 2012-04-25
 * @license MIT
 * @usage $.panzoom(); // use defaults
 *        $.panzoom('#mycontainer a', { 'small' : 'Zoom in by clicking', 'large' : 'Zoom out by clicking' }); // override defaults
 * @requires jQuery
 */

;(function ($, undefined) {
    var _css, _titles;

    "use strict";

    // requires jQuery or Zepto
    if (undefined === $) {
        throw 'Requires either jQuery or Zepto.';
    }

    // CSS to apply to elements on init
    _css = {
        a   : {
            'position' : 'relative',
            'overflow' : 'hidden',
            'display'  : 'inline-block',
            'width'    : undefined,
            'height'   : undefined
        },
        img : {
            'position' : 'absolute',
            'top'      : 0,
            'left'     : 0
        }
    };

    // title text to display onhover
    _titles = {
        small : 'Click to zoom in.',
        large : 'Click to zoom out.'
    };

    /**
     * Convert an x/y for one size to the x/y for another size
     * @private
     * @param array size1 [width, height]
     * @param array size2 [width, height]
     * @param array xy    [x, y]
     * @return array [x, y]
     */
    function proportions_(size1, size2, xy) {
        return [Math.round(xy[0] / (size1[0] / size2[0])), Math.round(xy[1] / (size1[1] / size2[1]))];
    }

    /**
     * Is the image in its "large" state?
     * @private
     * @param jQuery object a Anchor element
     * @param jQuery object img Image element
     * @return boolean
     */
    function isLarge_(a, img) {
        return (img.width() > a.width());
    }

    /**
     * Get the x and y of the click within the element
     * @private
     * @param jQuery object el Clicked element
     * @param object evt Event object
     * @return array [x, y]
     */
    function getPoint_(el, evt) {
        var offset;
        offset = $(el).offset();
        return [evt.pageX - offset.left, evt.pageY - offset.top];
    }

    /**
     * Get the pixel coordinates of the image based on the current mouse event
     * @private
     * @param jQuery object a Anchor element
     * @param jQuery object img Image element
     * @param Event object evt
     * @return void
     */
    function getCoords_(a, img, evt) {
        var pt, xy, top, left;

        pt = getPoint_(a, evt);
        xy = proportions_(img.dimensions.small, img.dimensions.large, pt);

        top  = (0 - (xy[1] - pt[1])) + 'px';
        left = (0 - (xy[0] - pt[0])) + 'px';

        return [left, top];
    }

    /**
     * Apply CSS, if not already applied
     * @private
     * @param jQuery object a   Anchor element
     * @param jQuery object img Image element
     * @return void
     */
    function applyCSS_(a, img) {
        // only apply the CSS if it hasn't already been applied
        if (true !== img.applied_) {
            _css.a.width  = img.dimensions.small[0] + 'px';
            _css.a.height = img.dimensions.small[1] + 'px';

            a.css(_css.a);
            img.css(_css.img);

            // store the fact that the styles have been applied
            img.applied_ = true;
        }
    }

    /**
     * Pan
     * @private
     * @param Event object evt
     * @return void
     */
    function move_(evt) {
        var a, img, coords;

        // get element references
        a   = evt.data.a;
        img = evt.data.img;

        // get new position
        coords = getCoords_(a, img, evt);

        // change position
        img.css({
            top  : coords[1],
            left : coords[0]
        });

        // disable browser's built-in behavior
        evt.preventDefault();
    }

    /**
     * Scale image to the larger size
     * @private
     * @param jQuery object a   Anchor element
     * @param jQuery object img Image element
     * @param Event object evt
     * @return void
     */
    function scaleUp_(a, img, evt) {
        var coords;

        coords   = getCoords_(a, img, evt);

        img.animate({
            top    : coords[1],
            left   : coords[0],
            width  : img.dimensions.large[0],
            height : img.dimensions.large[1]
        }, 'fast', function () {
            a
                .bind('mousemove', {a : a, img : img}, move_) // enable panning
                .attr('title', _titles.large)
            ;
        });

        // swap source while it's enlargenating
        img.attr('src', img.srcs.large);
    }

    /**
     * Scale image back to original size
     * @private
     * @param jQuery object a   Anchor element
     * @param jQuery object img Image element
     * @return void
     */
    function scaleDown_(a, img) {
        img.animate({
            top    : '0px',
            left   : '0px',
            width  : img.dimensions.small[0],
            height : img.dimensions.small[1]
        }, 'fast', function () {
            a
                .unbind('mousemove', move_) // disable panning
                .attr('title', _titles.small)
            ;

            // swap source after it's done scaling down
            img.attr('src', img.srcs.small);
        });
    }

    /**
     * Initialize
     * @public
     * @param String selector CSS selector for the container for the image(s) (optional, defaults to ".panzoom a")
     * @param Object titles   Object literal with tooltip text (assigned to the title attribute of the links)
     * @return void
     */
    function panzoom(selector, titles) {
        selector = selector || '.panzoom a';

        // allow overriding default tooltip text
        if (titles) {
            if (titles.small) {
                _titles.small = titles.small;
            }
            if (titles.large) {
                _titles.large = titles.large;
            }
        }

        // act on each anchor element
        $.each($(selector), function addImg(i, val) {
            var a, img, lrg;

            a   = $(this);
            img = $('img', a);

            // preload large image
            lrg = new Image();

            // enable click event once large image has loaded
            lrg.onload = function (evt) {
                img.srcs = {
                    small : img.attr('src'),
                    large : this.src
                };

                img.dimensions = {
                    small : [img.width(), img.height()],
                    large : [lrg.width, lrg.height]
                };

                a
                    .click(function (evt) {
                        applyCSS_(a, img);

                        if (isLarge_(a, img)) {
                            scaleDown_(a, img);
                        }
                        else {
                            scaleUp_(a, img, evt);
                        }

                        evt.preventDefault();
                    })
                    .attr('title', _titles.small)
                ;
            };

            // start loading large image
            lrg.src = a[0].href;
        });
    }

    // expose public method
    $.extend({
        panzoom : panzoom
    });
}(jQuery));
