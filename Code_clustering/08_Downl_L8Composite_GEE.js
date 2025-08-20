
// NOTE: 
// This code was obtained from https://gis.stackexchange.com/questions/425159/how-to-make-a-cloud-free-composite-for-landsat-8-collection-2-surface-reflectanc

// This code creates a composite of Landsat 8 Collection 2 images for a time period

var planc_paleoc = ee.FeatureCollection("projects/ee-my-francodbarr/assets/PlanicieconpaleocaucesNESW");

// A function that scales and masks Landsat 8 (C2) surface reflectance images.
function prepSrL8(image) {
  // Develop masks for unwanted pixels (fill, cloud, cloud shadow).
  var qaMask = image.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0); // Level 2 QA_PIXEL band (CFMask) to mask unwanted pixels.
  var saturationMask = image.select('QA_RADSAT').eq(0);

  // Apply the scaling factors to the appropriate bands.
  var getFactorImg = function(factorNames) {
    var factorList = image.toDictionary().select(factorNames).values();
    return ee.Image.constant(factorList);
  };
  var scaleImg = getFactorImg([
    'REFLECTANCE_MULT_BAND_.|TEMPERATURE_MULT_BAND_ST_B10']);
  var offsetImg = getFactorImg([
    'REFLECTANCE_ADD_BAND_.|TEMPERATURE_ADD_BAND_ST_B10']);
  var scaled = image.select('SR_B.|ST_B10').multiply(scaleImg).add(offsetImg);

  // Replace original bands with scaled bands and apply masks.
  return image.addBands(scaled, null, true)
    .updateMask(qaMask).updateMask(saturationMask);
}

// Planicie de paleocauces boundary.
var roi = planc_paleoc.geometry();

// Landsat 8 Collection 2 surface reflectance images of interest.
var col = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(roi)
  .filterDate('2020-11-01', '2021-02-28')
  .map(prepSrL8)
  .select('SR.*')
  .median();

// Display the cloud-free median composite.
var visParams = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'],
  min: 0,
  max: 0.4
};
Map.setCenter(-59.9511, -30.5953, 10);
Map.addLayer(col.clip(roi), visParams, 'Cloud-free mosaic');

var col_sel = col.select(['SR_B2',
                          'SR_B3',
                          'SR_B4',
                          'SR_B5',
                          'SR_B6',])

Export.image.toDrive({
  image: col_sel.clip(roi),
  description: 'PdePC_L8_Nov20-Mar21',
  folder: 'earthengine',
  fileNamePrefix: 'PdePC_L8_Nov20-Mar21',
  region: roi,//.geometry(),
  scale: 30,
  maxPixels: 1e10
}) 