#!/usr/bin/env python3

import alabaster
import os
import sys

sys.path.insert(0, os.path.abspath('..'))

version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                            'edgedb', '__init__.py')

with open(version_file, 'r') as f:
    for line in f:
        if line.startswith('__version__ ='):
            _, _, version = line.partition('=')
            version = version.strip(" \n'\"")
            break
    else:
        raise RuntimeError(
            'unable to read the version from edgedb/__init__.py')

# -- General configuration ------------------------------------------------

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.doctest',
    'sphinx.ext.viewcode',
    'sphinx.ext.githubpages',
    'sphinx.ext.intersphinx',
]

# This is done on purpose: multiple different documentations with
# different primary domains are linked with EdgeDB main docs.
# To avoid conflicts, we always have to be explicit with directives
# and roles, i.e. we cannot write ":module:", it has to be ":py:module:".
primary_domain = None

add_module_names = False

templates_path = ['_templates']
source_suffix = '.rst'
master_doc = 'index'
project = 'edgedb'
copyright = '2019-present MagicStack Inc. and the EdgeDB authors.'
author = 'MagicStack Inc. and the EdgeDB authors'
release = version
language = None
exclude_patterns = ['_build']
pygments_style = 'sphinx'
todo_include_todos = False
suppress_warnings = ['image.nonlocal_uri']

# -- Options for HTML output ----------------------------------------------

html_theme = 'sphinx_rtd_theme'
html_theme_path = [alabaster.get_path()]
html_title = 'EdgeDB JavaScript Driver Documentation'
html_short_title = 'edgedb'
html_static_path = ['_static']
html_sidebars = {
    '**': [
        'about.html',
        'navigation.html',
    ]
}
html_show_sourcelink = False
html_show_sphinx = False
html_show_copyright = True
html_context = {
    'css_files': [
        '_static/theme_overrides.css',
    ],
}
htmlhelp_basename = 'edgedbdoc'


# -- Options for LaTeX output ---------------------------------------------

latex_elements = {}

latex_documents = [
    (master_doc, 'edgedb.tex', 'EdgeDB JavaScript Driver Documentation',
     author, 'manual'),
]


# -- Options for manual page output ---------------------------------------

man_pages = [
    (master_doc, 'edgedb', 'EdgeDB JavaScript Driver Documentation',
     [author], 1)
]


# -- Options for Texinfo output -------------------------------------------

texinfo_documents = [
    (master_doc, 'edgedb', 'EdgeDB JavaScript Driver Documentation',
     author, 'edgedb',
     'Official EdgeDB JavaScript Driver',
     'Miscellaneous'),
]

# -- Options for intersphinx ----------------------------------------------

intersphinx_mapping = {'python': ('https://docs.python.org/3', None)}
