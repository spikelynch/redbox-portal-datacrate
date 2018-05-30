module.exports.datacrate = {
    // To check whether a zipfile is a DataCrate at upload,
    // DataCrateService looks for a file called bagInfo and
    // matches the contents against profileRe. The group
    // in the Re is the datacrate version
  bagitFile: 'bag-info.txt',
  profilePattern: 'profile-datacrate-v(\\d+\\.\\d+)\\.json',
  catalogFile: 'CATALOG.json',
};
