/*

  Version: 1.1.1 (FORK)

  Documentation: http://baymard.com/labs/country-selector#documentation

  Copyright (C) 2011 by Jamie Appleseed, Baymard Institute (baymard.com)

  Edited by Brandon Carl to increase readability, speed, and improve syntax.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.

*/

(function($) {

  'use strict';

  /*

    //// Defaults

  */

  var defaults = {
    'alternative-spellings'                 : true,
    'alternative-spellings-attr'            : 'data-alternative-spellings',
    'autocomplete-plugin'                   : 'jquery_ui',
    'autoFocus'                             : true,
    'autoselect'                            : true,
    'copy-attributes-to-text-field'         : true,
    'delay'                                 : 0,
    'ignore-disabled'                       : true,
    'intl-sensitivity'                      : 'base',
    'locale'                                : 'en',
    'minLength'                             : 0,
    'relevancy-sorting'                     : true,
    'relevancy-sorting-booster-attr'        : 'data-relevancy-booster',
    'relevancy-sorting-partial-match-value' : 1,
    'relevancy-sorting-strict-match-value'  : 5,
    'remove-valueless-options'              : false,
    'sort'                                  : false,
    'sort-attr'                             : 'data-priority',
    'sort-desc'                             : false
  };


  /*

    function handle_invalid_input

    Falls back to previously selected element if no match is found.

  */

  defaults.handle_invalid_input = function( context ) {
    var sel = 'option:selected' + (context.settings['ignore-disabled'] ? ':enabled' : '') + (context.settings['remove-valueless-options'] ? '[value!=""]' : '');
    return context.$text_field.val(context.$select_field.find(sel).first().text());
  };


  /*

    function handle_select_field

    How to handle existing `select` element. Defaults to hiding.

  */

  defaults.handle_select_field = function( context ) {
    return context.$select_field.hide();
  };


  /*

    function insert_text_field

    Adds a new element for autocompletion. Defaults to `<input>`.

  */

  defaults.insert_text_field = function( context ) {

    var $text_field = context.$text_field = $( '<input type="text" autocomplete="off"></input>' ),
        settings = context.settings;
    if ( settings['copy-attributes-to-text-field'] ) {
      var attrs = {};
      var raw_attrs = context.$select_field[0].attributes;
      for (var i=0; i < raw_attrs.length; i++) {
        var key = raw_attrs[i].name || raw_attrs[i].nodeName;
        var value = raw_attrs[i].value || raw_attrs[i].nodeValue;
        if ( key !== 'name' && key !== 'id' && typeof context.$select_field.attr(key) !== 'undefined' ) {
          attrs[key] = value;
        }
      }
      $text_field.attr( attrs );
    }

    // On blur, ensure that selection is valid.
    $text_field.blur(function() {
      var valid_values = context.$select_field.find('option').map(function(i, option) { return $(option).text(); });
      if ( ($.inArray($text_field.val(), valid_values) < 0) && typeof settings.handle_invalid_input === 'function' ) {
        settings.handle_invalid_input(context);
      }
    });

    // Give the input box the ability to select all text on mouse click
    if ( context.settings.autoselect ) $text_field.click(function() { this.select(); });

    // Set defaults and append to DOM
    context.settings.handle_invalid_input(context).insertAfter( context.$select_field );

  };


  /*

    function extract_options

    Indicates how options should be extracted from `select` field.

  */

  defaults.extract_options = function( context ) {

    var options = [],
        $options = context.$select_field.find(context.settings['ignore-disabled'] ? 'option:enabled' : 'option'),
        number_of_options = $options.length,
        settings = context.settings;

    // Iterate over each option in the select tag
    $options.each(function(){

      var $option = $(this),
          option = { 'real-value': $option.attr('value'), 'label': $option.text() };

      // Only process options with values
      if ( settings['remove-valueless-options'] && option['real-value'] === '') return;

      // `matches` includes text and alternative spellings
      option.matches = option.label + ' ' + ($option.attr(settings['alternative-spellings-attr']) || '');

      // Give each option a weight parameter for sorting
      if (settings.sort)
        option.weight = parseInt($option.attr(settings['sort-attr']), 10) || number_of_options;

      // Add relevancy score
      if (settings['relevancy-sorting']) {
        option['relevancy-score'] = 0;
        option['relevancy-score-booster'] = parseFloat($option.attr(settings['relevancy-sorting-booster-attr'])) || 1;
      }

      // Add option to combined array
      options.push( option );

    });

    // Sort the options based on weight
    if ( settings.sort ) {
      if ( settings['sort-desc'] ) {
        options.sort( function( a, b ) { return b.weight - a.weight; } );
      } else {
        options.sort( function( a, b ) { return a.weight - b.weight; } );
      }
    }

    // Attach the options, each with the following attributes: real-value, label, matches, weight (optional)
    context.options = options;

  };



  /*

    //// Public Methods

  */

  var public_methods = {

    init: function( customizations ) {

      if (/MSIE [1-6][\.,]/i.test(navigator.userAgent)) return this;

      // Extend defaults
      var settings = $.extend({}, defaults, customizations );

      // Apply to each element
      return this.each(function(){

        var $select_field = $(this), context;

        // Set up the context
        context = {
          '$select_field': $select_field,
          'settings': settings
        };

        // Extract options, add text field, and hide select field
        settings.extract_options( context );
        settings.insert_text_field( context );
        settings.handle_select_field( context );

        // Apply autocomplete-plugin
        if ( typeof settings['autocomplete-plugin'] === 'string' )
          adapters[settings['autocomplete-plugin']]( context );
        else
          settings['autocomplete-plugin']( context );

      });

    }

  };



  /*

    //// Adapters

  */

  var adapters = {
    jquery_ui: function( context ) {

      // Creates partial matches, or international when available
      function partialMatch(term) {
        var locale = context.settings.locale,
            sensitivity = context.settings['intl-sensitivity'],
            collator,
            re;

        try {
          collator = Intl.Collator(locale, { sensitivity : sensitivity });
          return function(haystack) {
            for (var i = 0; i < 1 + haystack.length - term.length; i++) {
              var first_part = haystack.slice(i, i + term.length);
              if (collator.compare(first_part, term) === 0) {
                return true;
              }
            }
            return false;
          };
        } catch (exception) {
          re = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
          return function(haystack) {
            return re.test(haystack);
          };
        }
      }

      // Creates strict matches (startsWith)
      function strictMatch(term) {
        var locale = context.settings.locale,
            sensitivity = context.settings['intl-sensitivity'],
            collator,
            re;

        try {
          collator = Intl.Collator(locale, { sensitivity : sensitivity });
          return function (haystack) {
            var first_part = haystack.slice(0, term.length);
            return collator.compare(first_part, term) === 0;
          };
        } catch (exception) {
          re = new RegExp( "^" + $.ui.autocomplete.escapeRegex(term), "i" );
          return function(haystack) {
            return re.test(haystack);
          };
        }
      }

      // Loose matching of search terms
      function filter_options( term ) {
        var split_term = term.split(' ');
        var matchers = [];
        for (var i=0; i < split_term.length; i++) {
          if ( split_term[i].length > 0 ) {
            var matcher = {};
            matcher.partial = partialMatch(split_term[i]);
            if ( context.settings['relevancy-sorting'] ) matcher.strict = strictMatch(split_term[i]);
            matchers.push( matcher );
          }
        }

        return $.grep( context.options, function( option ) {
          var partial_matches = 0, split_option_matches, strict_match;
          if ( context.settings['relevancy-sorting'] ) {
            strict_match = false;
            split_option_matches = option.matches.split(' ');
          }
          for ( var i=0; i < matchers.length; i++ ) {
            if ( matchers[i].partial( option.matches ) ) {
              partial_matches++;
            }
            if ( context.settings['relevancy-sorting'] ) {
              for (var q=0; q < split_option_matches.length; q++) {
                if ( matchers[i].strict( split_option_matches[q] ) ) {
                  strict_match = true;
                  break;
                }
              }
            }
          }
          if ( context.settings['relevancy-sorting'] ) {
            var option_score = 0;
            option_score += partial_matches * context.settings['relevancy-sorting-partial-match-value'];
            if ( strict_match ) {
              option_score += context.settings['relevancy-sorting-strict-match-value'];
            }
            option_score = option_score * option['relevancy-score-booster'];
            option['relevancy-score'] = option_score;
          }
          return (!term || matchers.length === partial_matches );
        });
      }

      // Update the select field value using either selected option or current input in the text field
      function update_select_value( option ) {
        if ( option ) {
          if ( context.$select_field.val() !== option['real-value'] ) {
            context.$select_field.val( option['real-value'] );
            context.$select_field.change();
          }
        } else {
          var option_name = context.$text_field.val().toLowerCase();
          var matching_option = { 'real-value': false };
          for (var i=0; i < context.options.length; i++) {
            if ( option_name === context.options[i].label.toLowerCase() ) {
              matching_option = context.options[i];
              break;
            }
          }
          if ( context.$select_field.val() !== matching_option['real-value'] ) {
            context.$select_field.val( matching_option['real-value'] || '' );
            context.$select_field.change();
          }
          if ( matching_option['real-value'] ) {
            context.$text_field.val( matching_option.label );
          }
          if ( typeof context.settings.handle_invalid_input === 'function' && context.$select_field.val() === '' ) {
            context.settings.handle_invalid_input( context );
          }
        }
      }

      // jQuery UI autocomplete settings & behavior
      context.$text_field.autocomplete({
        'minLength': context.settings.minLength,
        'delay': context.settings.delay,
        'autoFocus': context.settings.autoFocus,
        source: function( request, response ) {
          var filtered_options = filter_options( request.term );
          if ( context.settings['relevancy-sorting'] ) {
            filtered_options = filtered_options.sort( function( a, b ) {
            	if (b['relevancy-score'] == a['relevancy-score']) {
            		return b.label < a.label ? 1 : -1;
            	} else {
            		return b['relevancy-score'] - a['relevancy-score'];
            	}
            } );
          }
          response( filtered_options.slice(0, 1 + (context.settings.maxResults || (filtered_options.length - 1))) );
        },
        select: function( event, ui ) {
          update_select_value( ui.item );
        },
        change: function( event, ui ) {
          update_select_value( ui.item );
        },
        open: function( event, ui ) {
          var margin, $ac = $(".ui-autocomplete");

          // Autocomplete is not in right position on IE9. We must change the margin manually.
          if ("undefined" === typeof targetTop) targetTop = context.$text_field.offset().top + context.$text_field.outerHeight();
          if ((margin = targetTop - $ac.offset().top) != 0)
            $ac.css("top", "+="  + margin + "px");
        }
      });
      // Force refresh value of select field when form is submitted
      context.$text_field.parents('form').first().submit(function(){
        update_select_value();
      });
      // Select current value
      update_select_value();
    }
  };


  /*

    //// jQuery UI Extension

  */

  $.fn.selectToAutocomplete = function( method ) {
    if ( public_methods[method] ) {
      return public_methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return public_methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.fn.selectToAutocomplete' );
    }
  };

})(jQuery);
