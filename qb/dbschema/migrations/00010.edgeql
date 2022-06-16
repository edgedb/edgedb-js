CREATE MIGRATION m1lccxfwyed4xme7tj2xfczz5uciblizx3brasaovkm6hbtn2yoxua
    ONTO m1kvj4ewi2ueqdw3xozy2wauilf67fqconz35u55osxwd2ik6ybhrq
{
  CREATE SCALAR TYPE default::global_seq EXTENDING std::sequence;
  CREATE GLOBAL default::seq_global -> default::global_seq;
};
