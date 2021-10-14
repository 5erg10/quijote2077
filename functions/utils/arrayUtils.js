let isSubset = (arr, target) => {
  if(arr == undefined)
    return true;
  else if(arr && target == undefined)
    return false;
  else
    return arr.every(v => target.includes(v));
};

module.exports = { isSubset };