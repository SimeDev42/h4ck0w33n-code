# 2 · Laser-cut and assemble the lantern

[Previous: get ready](01-get-ready.md) · [Wiki home](README.md) · [Next: electronics](03-electronics.md)

Use **3 mm MDF**. Follow these local resources at the machine:

- [FabLab LightBurn guide](https://www.fablabguides.dk/laser-lightburn.html)
- [FabLab AEON guide — focusing](https://www.fablabguides.dk/laser-aeon.html)
- [FabLab guide to laser files](https://www.fablabguides.dk/guide-til-laserfiler.html)

The AEON page focuses on setting the material height and autofocus. Ask the instructor to demonstrate startup, extraction, cooling, air assist, emergency stop and shutdown on the actual machine. This wiki intentionally does not prescribe laser power or speed.

## Open the design in LightBurn

1. Start LightBurn on the workshop computer.
2. Choose **File → Open** and open [`Lanterne_samlet.lbrn2`](../laser-files/Lanterne_samlet.lbrn2) or [`Lanterne_samlet.svg`](../laser-files/Lanterne_samlet.svg). You can also laser-cut your own design, if you have one. The `.lbrn2` project preserves the layer setup; the SVG is an alternative import.
3. Inspect the complete layout. The supplied project records a material height of 3 mm; that does not replace measuring your sheet or focusing the machine.
4. Keep the original scale. Resizing the whole design also resizes the joints, which may stop fitting 3 mm MDF.
5. If adding decoration, keep it away from joints and ask the instructor which layer to use for engraving.

[Sketch1.dxf](../laser-files/Sketch1.dxf) through [Sketch14.dxf](../laser-files/Sketch14.dxf) are individual source files. Importing SVG/DXF does not recreate the LightBurn project's layer setup. Confirm dimensions and units after import; do not import every format together and accidentally duplicate the paths.

## Check the job

- In **Cuts / Layers**, identify cut outlines and any engraving separately. Confirm each intended layer has output enabled.
- Have the instructor apply the approved 3 mm MDF material settings. Saved settings are not a guarantee for today's sheet or machine.
- Check for duplicate outlines, accidental extra objects and geometry outside the sheet.
- Open **Preview** and inspect the simulated result and job order. Preview is useful for spotting missing or repeated paths; it does not prove the material will cut through. See [LightBurn Preview](https://docs.lightburnsoftware.com/latest/Reference/Preview/).
- Confirm that internal details are processed before loose outer parts and that any engraving happens before parts can move.

## At the AEON

1. Get the instructor's go-ahead and follow the linked FabLab machine guide.
2. Place the approved MDF flat. Keep the cutting area clear of loose debris.
3. Focus using the AEON procedure with the instructor. Confirm the focus probe is over the material before using autofocus.
4. Confirm the job origin and placement in LightBurn. With the lid closed, use the instructor-approved framing procedure to check that the job stays on the sheet and clear of obstructions.
5. Ask for a small test cut and joint-fit check before cutting the full set.
6. Start only after the instructor has checked the setup. Stay with the machine throughout the cut. If you see sustained flame or abnormal smoke, stop the job and alert staff; follow their emergency procedure.
7. Let extraction clear the enclosure as instructed before opening it. Check the cut before shifting the sheet; do not force uncut pieces free or rerun a moved sheet.
8. Remove parts and scrap, and follow the workshop shutdown/cleanup procedure.

## Dry-fit before gluing

Lay out the pieces beside the workshop sample. Ask the instructor to identify the base, walls, top and any internal supports; a numbered assembly map is still pending. Test the joints gently. Keep a path for the USB cable and access to the board's buttons. Test the electronics before permanently closing the lantern. Use the workshop's chosen adhesive and curing instructions; do not force tight joints or seal electronics inside an untested assembly.

**Checkpoint:** all parts are cut, the joints fit, and the enclosure can still be opened for electronics installation.
