.. _edgedb-js-funcops:

Functions and operators
-----------------------

Function syntax
^^^^^^^^^^^^^^^

All built-in standard library functions are reflected as functions in ``e``.

.. code-block:: typescript

  e.str_upper(e.str("hello"));
  // str_upper("hello")

  e.plus(e.int64(2), e.int64(2));
  // 2 + 2

  const nums = e.set(e.int64(3), e.int64(5), e.int64(7))
  e.in(e.int64(4), nums);
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

.. * - ``=``
..   - ``e.eq``
.. * - ``?=``
..   - ``e.coal_eq``
.. * - ``!=``
..   - ``e.neq``
.. * - ``?!=``
..   - ``e.coal_neq``
.. * - ``>=``
..   - ``e.gte``
.. * - ``>``
..   - ``e.gt``
.. * - ``<=``
..   - ``e.lte``
.. * - ``<``
..   - ``e.lt``
.. * - ``OR``
..   - ``e.or``
.. * - ``AND``
..   - ``e.and``
.. * - ``NOT``
..   - ``e.not``
.. * - ``+``
..   - ``e.plus``
.. * - ``-``
..   - ``e.minus``
.. * - ``*``
..   - ``e.mult``
.. * - ``/``
..   - ``e.div``
.. * - ``//``
..   - ``e.floordiv``
.. * - ``%``
..   - ``e.mod``
.. * - ``^``
..   - ``e.pow``
.. * - ``IN``
..   - ``e.in``
.. * - ``NOT IN``
..   - ``e.not_in``
.. * - ``EXISTS``
..   - ``e.exists``
.. * - ``DISTINCT``
..   - ``e.distinct``
.. * - ``UNION``
..   - ``e.union``
.. * - ``??``
..   - ``e.coalesce``
.. * - ``IF``
..   - ``e.if_else``
.. * - ``++``
..   - ``e.concat``
.. * - ``[i]``
..   - ``e.index``
.. * - ``[i:j:k]``
..   - ``e.slice``
.. * - ``[key]``
..   - ``e.destructure`` (JSON element access)
.. * - ``++``
..   - ``e.concatenate``
.. * - ``LIKE``
..   - ``e.like``
.. * - ``ILIKE``
..   - ``e.ilike``
.. * - ``NOT LIKE``
..   - ``e.not_like``
.. * - ``NOT ILIKE``
..   - ``e.not_ilike``
