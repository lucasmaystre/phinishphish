/**
 * A very basic and inefficient implementation of a set (linear time
 * operations). Use only for small sizes of set.
 */
phinishphish.Set = function() {
  this.elements = new Array();
};

phinishphish.Set.prototype.add = function(o) {
  if (!this.contains(o)) {
    this.elements.push(o);
  }
  return o;
};

phinishphish.Set.prototype.contains = function(o) {
  return this._findIndex(o) >= 0;
};

phinishphish.Set.prototype.remove = function(o) {
  var index = this._findIndex(o);
  if (index >= 0) {
    // Removes the element at the specified index.
    this.elements.splice(index, 1)
  }
  return o;
};

phinishphish.Set.prototype.clear = function() {
  this.elements = new Array();
};

phinishphish.Set.prototype.isEmpty = function() {
  return this.size() > 0;
};

phinishphish.Set.prototype.size = function() {
  return this.elements.length;
};

phinishphish.Set.prototype._findIndex = function(o) {
  for (var i = 0; i < this.elements.length; ++i) {
    if (this.elements[i] == o) {
      return i;
    }
  }
  return -1;
}
