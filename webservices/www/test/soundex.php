<?php

if (soundex($_GET['a']) == soundex($_GET['b'])) {
  echo "MATCH!<br />";
} else {
  echo "no match.<br />";
}
echo "soundex(a) = ".soundex($_GET['a'])."<br />";

?>

<form>
  <input type="text" name="a" />
  <input type="text" name="b" />
  <input type="submit" />
</form>
