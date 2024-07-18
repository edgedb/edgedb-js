insert BlogPost {
  title := <str>$blogpost_title,
  description := <str>$blogpost_description,
  content := <str>$blogpost_content,
  author := global current_user
}
