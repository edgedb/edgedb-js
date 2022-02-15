.. _edgedb-js-funcops:

Functions and operators
-----------------------

Function syntax
^^^^^^^^^^^^^^^

All built-in standard library functions are reflected as functions in ``e``.

.. code-block:: typescript

  e.str_upper(e.str("hello"));
  // str_upper("hello")

  e.op(e.int64(2), '+', e.int64(2));
  // 2 + 2

  const nums = e.set(e.int64(3), e.int64(5), e.int64(7))
  e.op(e.int64(4), 'in', nums);
  // 4 in {3, 5, 7}

  e.math.mean(nums);
  // math::mean({3, 5, 7})



Operator syntax
^^^^^^^^^^^^^^^

By comparison, operators do *not* each have a corresponding function on the
``e`` object. Instead, use the ``e.op`` function.

**Unary operators**

Unary operators operate on a single argument: ``OPERATOR <arg>``.

.. code-block:: typescript

  e.op('not', e.bool(true));      // not true
  e.op('exists', e.set('hi'));    // exists {'hi'}

**Binary operators**

Unary operators operate on two arguments: ``<arg> OPERATOR <arg>``.

.. code-block:: typescript

  e.op(e.str('Hello '), '++', e.str('World!'));
  // 'Hello ' ++ 'World!'


**Ternary operators**

Unary operators operate on three arguments: ``<arg> OPERATOR <arg> OPERATOR
<arg>``. Currently there's only one ternary operator: the ``if else``
construct.

.. code-block:: typescript

  e.op(e.str('😄'), 'if', e.bool(true), 'else', e.str('😢'));
  // 😄 if true else 😢

**Operator reference**

.. list-table::

  * - Prefix operators
    - ``"exists"`` ``"distinct"`` ``"not"``
  * - Infix operators
    - ``"="`` ``"?="`` ``"!="`` ``"?!="`` ``">="`` ``">"`` ``"<="`` ``"<"``
      ``"or"`` ``"and"`` ``"+"`` ``"-"`` ``"*"`` ``"/"`` ``"//"`` ``"%"``
      ``"^"`` ``"in"`` ``"not in"`` ``"union"`` ``"??"`` ``"++"`` ``"like"``
      ``"ilike"`` ``"not like"`` ``"not ilike"``
  * - Ternary operators
    - ``"if"/"else"``
