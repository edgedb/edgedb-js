CREATE MIGRATION m1b62haafkhumqw6hiq7jvih32qqtrasau4i3wpscc34yhpegiooqq
    ONTO m1ooskmhgmkiqc66xfkdhtynppvluh6nvn7zsiun4tntkmegxpigrq
{
  ALTER SCALAR TYPE default::Genre EXTENDING enum<Horror, Action, RomCom, `Science Fiction`>;
};
