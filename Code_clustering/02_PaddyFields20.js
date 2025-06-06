// NOTE: RUN THIS CODE IN THE GOOGLE EARTH ENGINE PLATFORM

// Code adapted from Gandhi, Ujaval, 2021. End-to-End Google Earth Engine Course. Spatial Thoughts. 
// https://courses.spatialthoughts.com/end-to-end-gee.html

// Load point samples. NOTE: add a label to each point!
var samples = ee.FeatureCollection("projects/ee-my-francodbarr/assets/MuestreoCoberturasNDVI_unif"); // NOTE: CHANGE THE ASSET SOURCE PATH IF NECESSARY
// Load MODIS NDVI product
var modis = ee.ImageCollection('MODIS/061/MOD13Q1');

// MODIS NDVI data preprocessing
var filtered = modis
  .filter(ee.Filter.date('2000-02-18', '2022-12-31'))
var modisNDVI = filtered.select('NDVI')
var scaledNDVI = modisNDVI.map(function(image){
  return image.multiply(0.0001)
  .copyProperties(image,['system:time_start','system:time_end']);
});

// Extracting NDVI time series for each point
var triplets = scaledNDVI.map(function(image) {
  var withStats = image.reduceRegions({
  collection: samples,
  reducer: ee.Reducer.mean().setOutputs(['ndvi']),
  scale: 250
  }).map(function(feature) {
    return feature.set('imageId', image.id())
  })
  return withStats
}).flatten()

var format = function(table, rowId, colId) {
  var rows = table.distinct(rowId); 
  var joined = ee.Join.saveAll('matches').apply({
    primary: rows, 
    secondary: table, 
    condition: ee.Filter.equals({
      leftField: rowId, 
      rightField: rowId
    })
  });
         
  return joined.map(function(row) {
      var values = ee.List(row.get('matches'))
        .map(function(feature) {
          feature = ee.Feature(feature);
          var ndvi = ee.List([feature.get('ndvi'), -9999])
            .reduce(ee.Reducer.firstNonNull())
          return [feature.get(colId), ee.Number(ndvi).format('%.2f')];
        });
      return row.select([rowId]).set(ee.Dictionary(values.flatten()));
    });
};

var timeSeriesResults = format(triplets, 'Cobertura', 'imageId');
print(timeSeriesResults.first()) 

// Exporting table with NDVI values by date, by sample point
Export.table.toDrive({
  collection: timeSeriesResults,
  description: 'MODIS_NDVI_Series',
  folder: 'earthengine',
  fileNamePrefix: 'modis_ndvi_series',
  fileFormat: 'CSV'})
