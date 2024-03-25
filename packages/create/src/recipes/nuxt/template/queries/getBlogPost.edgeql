select BlogPost {
  id,
  title,
  description,
  content
}
filter .id = <uuid>$blogpost_id;
