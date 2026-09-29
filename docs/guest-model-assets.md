# Guest model graphical sources and limits

The sculpted head/scalp subset in `js/data/guest-anatomy.js` derives from MakeHuman core graphical asset `makehuman/data/3dobjs/base.obj`, pinned at `a8bc2d54ff0ac92e78ff71431b1023eda42bf482` in `makehumancommunity/makehuman`. Core graphical assets are CC0 1.0; the copied license is `docs/licenses/makehuman-cc0.md`. The MakeHuman application source is not copied or distributed.

`python scripts/build-guest-anatomy.py /path/to/base.obj` reproduces the local head/scalp data. Only the head subset ships. Body, helper and rig parts from the source asset are excluded. The body, garments, shoes, individual fingers, articulations and instanced animation implementation are RentSketch procedural geometry. There is no third-party runtime model request and no customer-image processing.

Guests remain decorative preview objects. They never become inventory, quote or checkout lines. Eleven shared instanced batches are used regardless of crowd count. Existing motion toggle, reduced-motion preference and visibility handling remain. Tests check finite animated transforms, seating, unchanged rental data, instance allocation and 24/40-person batches. These are more anatomically detailed planning characters, not photorealistic scanned people or motion-captured actors.
