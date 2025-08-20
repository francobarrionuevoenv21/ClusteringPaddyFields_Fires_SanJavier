// NOTE: 
// This code was obtained from // https://gis.stackexchange.com/questions/451761/cloud-mask-for-landsat-7-surface-reflectance-collection-2-level-2-tier-1

// This code creates a composite of Landsat 4, 5, 7 Collection 2 images for a time period

var planc_paleoc = ee.FeatureCollection("projects/ee-my-francodbarr/assets/PlanicieconpaleocaucesNESW");

function maskL457sr(image) {
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Unused
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0); // Level 2 QA_PIXEL band (CFMask) to mask unwanted pixels.
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBand = image.select('ST_B6').multiply(0.00341802).add(149.0);

  // Replace the original bands with the scaled ones and apply the masks.
  return image.addBands(opticalBands, null, true)
      .addBands(thermalBand, null, true)
      .updateMask(qaMask)
      .updateMask(saturationMask);
}

// Map the function over one year of data.
var collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
                     .filterDate('2008-11-01', '2009-02-28')
                     .map(maskL457sr)
                     .filter(ee.Filter.bounds(planc_paleoc.geometry()));

var composite = collection.median();

// Display the results.
Map.setCenter(-59.9511, -30.5953, 10);

Map.addLayer(composite.clip(planc_paleoc.geometry()), {bands: ['SR_B3', 'SR_B2', 'SR_B1'], min: 0, max: 0.3});
//Map.addLayer(planc_paleoc.geometry(), {color: 'red'}, 'Planicie Paleocauces');

Export.image.toDrive({
  image: composite.clip(planc_paleoc.geometry()),
  description: 'PdePC_L7_Nov08-Mar09',
  folder: 'earthengine',
  fileNamePrefix: 'PdePC_L7_Nov08-Mar09',
  region: planc_paleoc.geometry(),
  scale: 30,
  maxPixels: 1e10
})