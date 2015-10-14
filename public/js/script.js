function formToJSON($form) {
  var data = {};
  $($form.serializeArray()).each(function(index, obj){
      data[obj.name] = obj.value;
  });
  return JSON.stringify(data);
}

function showErrors($form, errors) {
  $(errors).each(function(idx, error) {
    $col = $form.find('[name="'+error.name+'"]').closest('.column');
    $col.addClass('error');
    $col.children('.error').remove();
    $error = $('<small></small>');
    $error.addClass('error');
    $error.text(error.message);
    $col.append($error);
  });
}